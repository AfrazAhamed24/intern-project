import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from config import Config
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import base64
import io
import re
from functools import wraps
from pymongo import MongoClient
from bson.objectid import ObjectId
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    import boto3
except ImportError:
    boto3 = None

try:
    import pytesseract
    import subprocess
    common_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe'),
        os.path.join(os.environ.get('PROGRAMFILES', ''), 'Tesseract-OCR', 'tesseract.exe'),
        '/usr/bin/tesseract',
        '/usr/local/bin/tesseract',
    ]
    for tp in common_paths:
        if os.path.isfile(tp):
            pytesseract.pytesseract.tesseract_cmd = tp
            print(f'TESSERACT: configured binary at {tp}', flush=True)
            break
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        print('TESSERACT: binary not found in common paths', flush=True)
except Exception as e:
    print(f'TESSERACT: import failed - {e}', flush=True)
    pytesseract = None

try:
    import fitz
except ImportError:
    fitz = None

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize MongoDB Client
client = MongoClient(app.config['MONGO_URI'])
# Uses the 'vendor_portal' database specified in the URI, explicitly casted to prevent ENV var overrides
db = client['vendor_portal']

# Initialize S3 Client
s3_client = None
S3_BUCKET = app.config.get('S3_BUCKET')
if boto3 and app.config.get('AWS_ACCESS_KEY_ID'):
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=app.config['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=app.config['AWS_SECRET_ACCESS_KEY'],
            region_name=app.config.get('AWS_REGION', 'us-east-1')
        )
        print('S3: client initialized', flush=True)
    except Exception as e:
        print(f'S3: init failed - {e}', flush=True)


def _s3_upload(file_bytes, file_name, content_type='application/octet-stream'):
    if not s3_client or not S3_BUCKET:
        return None
    ext = file_name.rsplit('.', 1)[-1] if '.' in file_name else 'bin'
    key = f"documents/{uuid.uuid4().hex}.{ext}"
    s3_client.put_object(Bucket=S3_BUCKET, Key=key, Body=file_bytes, ContentType=content_type)
    return key


def _s3_delete(key):
    if not s3_client or not S3_BUCKET or not key:
        return
    try:
        s3_client.delete_object(Bucket=S3_BUCKET, Key=key)
    except Exception:
        pass


def _s3_presigned_url(key, expiration=3600):
    if not s3_client or not S3_BUCKET or not key:
        return None
    try:
        return s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': key},
            ExpiresIn=expiration
        )
    except Exception:
        return None

OCR_DOCUMENT_TYPES = {'GST Certificate', 'PAN Card'}
GST_REGEX = re.compile(r'\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]{1,2}Z[A-Z0-9]\b')
PAN_REGEX = re.compile(r'\b[A-Z]{5}\d{4}[A-Z]{1}\b')
COMPLIANCE_APPROVED_STATUS = 'COMPLIANCE_APPROVED'
LEGACY_COMPLIANCE_APPROVED_STATUS = 'Approved'
COMPLIANCE_APPROVED_STATUSES = {LEGACY_COMPLIANCE_APPROVED_STATUS, COMPLIANCE_APPROVED_STATUS}
FINANCE_QUEUE_STATUSES = {COMPLIANCE_APPROVED_STATUS}
FINANCE_REVIEW_STATUS = 'FINANCE_REVIEW'
FINANCE_APPROVED_STATUS = 'FINANCE_APPROVED'
FINANCE_REJECTED_STATUS = 'FINANCE_REJECTED'
ACTIVE_STATUS = 'ACTIVE'
INACTIVE_STATUS = 'INACTIVE'
BUSINESS_NAME_LABELS = [
    'NAME OF THE BUSINESS', 'NAME OF BUSINESS', 'LEGAL NAME',
    'TRADE NAME', 'BUSINESS NAME', 'NAME OF THE COMPANY',
    'COMPANY NAME', 'NAME OF HOLDER', 'CARD HOLDER',
    'FULL NAME', 'NAME OF THE HOLDER', 'NAME OF FIRM',
]
ADDRESS_LABELS = ['ADDRESS', 'REGISTERED OFFICE', 'BUSINESS ADDRESS', 'PRINCIPAL PLACE']
BREAK_LABELS = ['GSTIN', 'PAN', 'STATE', 'EMAIL', 'PHONE', 'MOBILE', 'AADHAAR']


def _normalize_ocr_text(text):
    if not text:
        return ''
    return ' '.join(text.upper().split())


def _convert_pdf_to_images(pdf_bytes, dpi=300):
    if not fitz:
        print('OCR DEBUG: fitz (PyMuPDF) not available, cannot process PDF')
        return None
    try:
        doc = fitz.open(stream=pdf_bytes, filetype='pdf')
        print(f'OCR DEBUG: PDF opened successfully, pages={len(doc)}')
        images = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=dpi)
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            print(f'OCR DEBUG: PDF page {page_num + 1}/{len(doc)} converted to image size={pix.width}x{pix.height}')
            images.append(img)
        doc.close()
        return images
    except Exception as exc:
        print(f'OCR DEBUG: PDF conversion exception={repr(exc)}')
        return None


def _preprocess_image(image):
    try:
        max_dim = 2000
        if max(image.size) > max_dim:
            ratio = max_dim / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.LANCZOS)
            print(f'OCR DEBUG: resized image from original size to {new_size}')
        if image.mode != 'L':
            image = image.convert('L')
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        image = ImageOps.autocontrast(image, cutoff=3)
        image = image.filter(ImageFilter.SHARPEN)
        image = image.filter(ImageFilter.MedianFilter(size=3))
        return image
    except Exception as exc:
        print(f'OCR DEBUG: image preprocessing exception={repr(exc)}')
        return image


def _extract_ocr_image(file_data):
    if not file_data:
        print('OCR DEBUG: no file_data provided to _extract_ocr_image')
        return None
    try:
        print(f'OCR DEBUG: received file_data length={len(file_data)}')
        mime_type = 'unknown'
        if file_data.startswith('data:') and ',' in file_data:
            mime_type = file_data.split(';')[0].split(':')[1] if ':' in file_data[:40] else 'unknown'
            print(f'OCR DEBUG: stripping data URL prefix, detected MIME type={mime_type}')
            file_data = file_data.split(',', 1)[1]
        image_bytes = base64.b64decode(file_data)
        print(f'OCR DEBUG: decoded image bytes length={len(image_bytes)}')
        if image_bytes[:4] == b'%PDF':
            print('OCR DEBUG: detected PDF format from magic bytes')
            pdf_images = _convert_pdf_to_images(image_bytes)
            if pdf_images:
                print(f'OCR DEBUG: PDF conversion produced {len(pdf_images)} image(s)')
                return pdf_images
            print('OCR DEBUG: PDF conversion returned no images')
            return None
        img = Image.open(io.BytesIO(image_bytes))
        print(f'OCR DEBUG: image opened successfully format={img.format} mode={img.mode} size={img.size}')
        return [img]
    except Exception as exc:
        print(f'OCR DEBUG: _extract_ocr_image exception={repr(exc)}')
        return None


def _extract_business_name(ocr_text):
    if not ocr_text:
        return ''
    lines = ocr_text.strip().split('\n')
    for i, line in enumerate(lines):
        upper = line.strip().upper()
        for label in BUSINESS_NAME_LABELS:
            if label in upper:
                after = upper.split(label, 1)[1].strip().lstrip(':.- ')
                if after:
                    return after.strip()
                if i + 1 < len(lines):
                    return lines[i + 1].strip()
    for line in lines:
        s = line.strip()
        if s and not s.isdigit() and len(s) > 3:
            return s
    return ''


def _extract_address(ocr_text):
    if not ocr_text:
        return ''
    lines = ocr_text.strip().split('\n')
    for i, line in enumerate(lines):
        upper = line.strip().upper()
        for label in ADDRESS_LABELS:
            if label in upper:
                addr_lines = []
                after = upper.split(label, 1)[1].strip().lstrip(':.- ')
                if after:
                    addr_lines.append(after)
                for j in range(i + 1, min(i + 6, len(lines))):
                    nl = lines[j].strip()
                    if not nl:
                        break
                    if any(k in nl.upper() for k in BREAK_LABELS):
                        break
                    addr_lines.append(nl)
                if addr_lines:
                    return ' '.join(addr_lines)
    return ''


def _run_ocr_for_document(document_type, file_data, file_name):
    print(f'OCR DEBUG: _run_ocr_for_document invoked document_type={document_type} file_name={file_name} pytesseract_available={bool(pytesseract)}')
    if document_type not in OCR_DOCUMENT_TYPES:
        print('OCR DEBUG: document type does not require OCR')
        return {
            'ocrStatus': 'Not Required',
            'ocrText': '',
            'ocrExtractedValue': '',
            'ocrMatchStatus': 'Not Applicable'
        }

    if not pytesseract:
        print('OCR DEBUG: pytesseract import not available')
        return {
            'ocrStatus': 'Not Detected',
            'ocrText': '',
            'ocrExtractedValue': '',
            'extractedGST': '',
            'extractedPAN': '',
            'extractedBusinessName': '',
            'extractedAddress': '',
            'ocrMatchStatus': 'Not Detected',
            'ocrSourceFile': file_name
        }

    images = _extract_ocr_image(file_data)
    if not images:
        print('OCR DEBUG: no images available for OCR')
        return {
            'ocrStatus': 'Not Detected',
            'ocrText': '',
            'ocrExtractedValue': '',
            'extractedGST': '',
            'extractedPAN': '',
            'extractedBusinessName': '',
            'extractedAddress': '',
            'ocrMatchStatus': 'Not Detected',
            'ocrSourceFile': file_name
        }

    combined_text = ''
    try:
        for idx, image in enumerate(images):
            preprocessed = _preprocess_image(image)
            print(f'OCR DEBUG: running pytesseract on page/image {idx + 1} of {len(images)}')
            page_text = pytesseract.image_to_string(preprocessed, config='--oem 3 --psm 3')
            print(f'OCR DEBUG: page {idx + 1} raw OCR text length={len(page_text or "")}')
            print(f'OCR DEBUG: page {idx + 1} OCR text preview={repr(page_text[:200])}')
            combined_text += page_text + '\n'

        extracted_text = combined_text.strip()
        print(f'OCR DEBUG: combined OCR text length={len(extracted_text)}')
        print(f'OCR DEBUG: full OCR text preview={repr(extracted_text[:500])}')

        normalized_text = _normalize_ocr_text(extracted_text)
        print(f'OCR DEBUG: normalized text length={len(normalized_text)}')

        extracted_gst = ''
        extracted_pan = ''
        gst_match = GST_REGEX.search(normalized_text)
        pan_match = PAN_REGEX.search(normalized_text)
        if gst_match:
            extracted_gst = gst_match.group(0)
        if pan_match:
            extracted_pan = pan_match.group(0)
        print(f'OCR DEBUG: extracted_gst={extracted_gst} extracted_pan={extracted_pan}')

        extracted_business_name = _extract_business_name(extracted_text)
        extracted_address = _extract_address(extracted_text)
        print(f'OCR DEBUG: extracted_business_name={extracted_business_name}')
        print(f'OCR DEBUG: extracted_address={extracted_address[:100] if extracted_address else "N/A"}')

        return {
            'ocrStatus': 'Detected' if extracted_text else 'Not Detected',
            'ocrText': extracted_text,
            'ocrExtractedValue': normalized_text,
            'extractedGST': extracted_gst,
            'extractedPAN': extracted_pan,
            'extractedBusinessName': extracted_business_name,
            'extractedAddress': extracted_address,
            'ocrMatchStatus': 'Detected' if extracted_text else 'Not Detected',
            'ocrSourceFile': file_name
        }
    except Exception as exc:
        print(f'OCR DEBUG: pytesseract exception={repr(exc)}')
        import traceback
        traceback.print_exc()
        return {
            'ocrStatus': 'Not Detected',
            'ocrText': '',
            'ocrExtractedValue': '',
            'extractedGST': '',
            'extractedPAN': '',
            'extractedBusinessName': '',
            'extractedAddress': '',
            'ocrMatchStatus': 'Not Detected',
            'ocrSourceFile': file_name
        }


def _determine_match_status(profile_value, extracted_value):
    profile_norm = _normalize_ocr_text(str(profile_value or ''))
    extracted_norm = _normalize_ocr_text(str(extracted_value or ''))
    if not profile_norm and not extracted_norm:
        return 'Mismatch'
    if not profile_norm or not extracted_norm:
        return 'Mismatch'
    if profile_norm == extracted_norm:
        return 'Match'
    if profile_norm in extracted_norm or extracted_norm in profile_norm:
        return 'Match'
    common_chars = len(set(profile_norm) & set(extracted_norm))
    min_len = min(len(profile_norm), len(extracted_norm))
    if min_len > 0 and common_chars / min_len > 0.7:
        return 'Review'
    return 'Mismatch'


def _get_vendor_document_summaries(vendor_id):
    vendor_profile = db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not vendor_profile:
        print(f'OCR DEBUG: vendor profile not found for vendor_id={vendor_id}')
        return [], []

    user_id_str = vendor_profile.get('userId', '')
    try:
        user_oid = ObjectId(user_id_str)
    except Exception:
        user_oid = user_id_str

    docs_cursor = db.documents.find({'vendorId': user_oid})
    docs = []
    by_type = {}
    combined_ocr_text = ''
    for doc in docs_cursor:
        doc.pop('fileData', None)
        doc['_id'] = str(doc['_id'])
        doc['vendorId'] = str(doc['vendorId'])
        if doc.get('s3Key'):
            doc['fileUrl'] = _s3_presigned_url(doc['s3Key']) or doc.get('fileUrl', '')
        if 'uploadDate' in doc and isinstance(doc['uploadDate'], datetime.datetime):
            doc['uploadDate'] = doc['uploadDate'].isoformat()
        if doc.get('documentType') in {'GST Certificate', 'PAN Card'}:
            combined_ocr_text += ' ' + (doc.get('ocrText') or '')
        by_type[doc.get('documentType')] = doc
        docs.append(doc)

    comparison = []

    gst_doc = by_type.get('GST Certificate')
    gst_profile = vendor_profile.get('gstNumber', '')
    gst_ocr = gst_doc.get('extractedGST', '') if gst_doc else ''
    gst_ocr_status = gst_doc.get('ocrStatus', 'Not Detected') if gst_doc else 'Not Detected'
    comparison.append({
        'fieldName': 'GST Number',
        'documentType': 'GST Certificate',
        'profileValue': gst_profile,
        'ocrExtractedValue': gst_ocr,
        'ocrStatus': gst_ocr_status,
        'matchStatus': _determine_match_status(gst_profile, gst_ocr) if gst_doc else 'No Document'
    })

    pan_doc = by_type.get('PAN Card')
    pan_profile = vendor_profile.get('panNumber', '')
    pan_ocr = pan_doc.get('extractedPAN', '') if pan_doc else ''
    pan_ocr_status = pan_doc.get('ocrStatus', 'Not Detected') if pan_doc else 'Not Detected'
    comparison.append({
        'fieldName': 'PAN Number',
        'documentType': 'PAN Card',
        'profileValue': pan_profile,
        'ocrExtractedValue': pan_ocr,
        'ocrStatus': pan_ocr_status,
        'matchStatus': _determine_match_status(pan_profile, pan_ocr) if pan_doc else 'No Document'
    })

    company_profile = vendor_profile.get('companyName', '')
    business_name_ocr = _extract_business_name(combined_ocr_text) if combined_ocr_text.strip() else ''
    has_any_doc = bool(gst_doc or pan_doc)
    comparison.append({
        'fieldName': 'Business Name',
        'documentType': 'GST/PAN',
        'profileValue': company_profile,
        'ocrExtractedValue': business_name_ocr,
        'ocrStatus': 'Detected' if business_name_ocr else 'Not Detected',
        'matchStatus': _determine_match_status(company_profile, business_name_ocr) if has_any_doc else 'No Document'
    })

    address_profile = vendor_profile.get('address', '')
    address_ocr = _extract_address(combined_ocr_text) if combined_ocr_text.strip() else ''
    comparison.append({
        'fieldName': 'Address',
        'documentType': 'GST/PAN',
        'profileValue': address_profile,
        'ocrExtractedValue': address_ocr,
        'ocrStatus': 'Detected' if address_ocr else 'Not Detected',
        'matchStatus': _determine_match_status(address_profile, address_ocr) if has_any_doc else 'No Document'
    })

    return docs, comparison


def _get_vendor_documents_for_finance(vendor_id):
    vendor_profile = db.vendors.find_one({"_id": ObjectId(vendor_id)})
    if not vendor_profile:
        return None, []

    user_id_str = vendor_profile.get('userId', '')
    try:
        user_oid = ObjectId(user_id_str)
    except Exception:
        user_oid = user_id_str

    return vendor_profile, list(db.documents.find({'vendorId': user_oid}))


def _build_finance_vendor_payload(vendor, docs=None, comparison=None):
    payload = dict(vendor)
    payload['_id'] = str(payload['_id'])
    payload['complianceStatus'] = _normalize_compliance_status(payload.get('complianceStatus') or payload.get('status', ''))
    payload['financeStatus'] = payload.get('financeStatus') or (
        FINANCE_REVIEW_STATUS if _is_compliance_approved(payload.get('complianceStatus') or payload.get('status', '')) else payload.get('status', '')
    )
    if docs is None or comparison is None:
        docs, comparison = _get_vendor_document_summaries(payload['_id'])
    payload['documents'] = docs
    payload['ocrSummary'] = comparison
    return payload


def _finance_validation_errors(vendor, documents):
    errors = []
    doc_by_type = {doc.get('documentType'): doc for doc in documents}

    compliance_status = _normalize_compliance_status(vendor.get('complianceStatus') or vendor.get('status', ''))
    if compliance_status != COMPLIANCE_APPROVED_STATUS:
        errors.append('Vendor is not compliance approved.')

    if not vendor.get('gstNumber'):
        errors.append('GST number is missing in vendor profile.')
    gst_doc = doc_by_type.get('GST Certificate')
    if not gst_doc or not gst_doc.get('extractedGST'):
        errors.append('GST document OCR data is missing.')

    if not vendor.get('panNumber'):
        errors.append('PAN number is missing in vendor profile.')
    pan_doc = doc_by_type.get('PAN Card')
    if not pan_doc or not pan_doc.get('extractedPAN'):
        errors.append('PAN document OCR data is missing.')

    bank_doc = doc_by_type.get('Bank Proof')
    bank_fields_present = any(vendor.get(field) for field in ('bankName', 'accountNumber', 'bankAccountNumber', 'ifsc', 'ifscCode'))
    if not bank_doc and not bank_fields_present:
        errors.append('Bank proof document is missing.')

    return errors


def _write_finance_audit_log(vendor_id, action, performed_by):
    try:
        audit_doc = {
            'vendorId': ObjectId(vendor_id) if ObjectId.is_valid(str(vendor_id)) else str(vendor_id),
            'action': action,
            'performedBy': str(performed_by),
            'timestamp': datetime.datetime.utcnow(),
        }
        db.audit_logs.insert_one(audit_doc)
    except Exception as exc:
        print(f'FINANCE AUDIT DEBUG: failed action={action} vendor_id={vendor_id} error={repr(exc)}')


def _normalize_compliance_status(status):
    if status in COMPLIANCE_APPROVED_STATUSES:
        return COMPLIANCE_APPROVED_STATUS
    return status or ''


def _is_compliance_approved(status):
    return _normalize_compliance_status(status) == COMPLIANCE_APPROVED_STATUS


def _admin_current_workflow_status(vendor):
    status = vendor.get('status', '')
    finance_status = vendor.get('financeStatus', '')
    compliance_status = _normalize_compliance_status(vendor.get('complianceStatus') or status)

    if status == INACTIVE_STATUS:
        return INACTIVE_STATUS
    if finance_status == FINANCE_REJECTED_STATUS or status == FINANCE_REJECTED_STATUS:
        return FINANCE_REJECTED_STATUS
    if finance_status == FINANCE_APPROVED_STATUS:
        return ACTIVE_STATUS if status != INACTIVE_STATUS else FINANCE_APPROVED_STATUS
    if status == ACTIVE_STATUS:
        return ACTIVE_STATUS
    if finance_status == FINANCE_REVIEW_STATUS:
        return FINANCE_REVIEW_STATUS
    if compliance_status == COMPLIANCE_APPROVED_STATUS:
        return COMPLIANCE_APPROVED_STATUS
    return status or 'Draft'


def _admin_vendor_payload(vendor, include_documents=False):
    payload = dict(vendor)
    payload['_id'] = str(payload['_id'])
    payload['complianceStatus'] = _normalize_compliance_status(payload.get('complianceStatus') or payload.get('status', ''))
    payload['financeStatus'] = payload.get('financeStatus') or (
        FINANCE_REVIEW_STATUS if _is_compliance_approved(payload.get('complianceStatus') or payload.get('status', '')) else ''
    )
    payload['currentWorkflowStatus'] = _admin_current_workflow_status(payload)
    documents, comparison = _get_vendor_document_summaries(payload['_id'])
    payload['ocrSummary'] = comparison
    if include_documents:
        payload['documents'] = documents
    payload['profile'] = {
        'companyName': payload.get('companyName', ''),
        'gstNumber': payload.get('gstNumber', ''),
        'panNumber': payload.get('panNumber', ''),
        'contactPerson': payload.get('contactPerson', ''),
        'phone': payload.get('phone', ''),
        'email': payload.get('email', ''),
        'address': payload.get('address', ''),
        'category': payload.get('category', ''),
        'region': payload.get('region', ''),
    }
    return payload


def _admin_dashboard_metrics():
    vendors = list(db.vendors.find({}).sort('createdAt', -1))
    metrics = {
        'totalVendors': len(vendors),
        'draftVendors': 0,
        'underReviewVendors': 0,
        'complianceApprovedVendors': 0,
        'financeApprovedVendors': 0,
        'activeVendors': 0,
        'rejectedVendors': 0,
        'pendingReviews': 0,
    }

    for vendor in vendors:
        workflow_status = _admin_current_workflow_status(vendor)
        finance_status = vendor.get('financeStatus', '')
        compliance_status = _normalize_compliance_status(vendor.get('complianceStatus') or vendor.get('status', ''))

        if workflow_status == 'Draft':
            metrics['draftVendors'] += 1
        if workflow_status == 'Under Review':
            metrics['underReviewVendors'] += 1
        if compliance_status == COMPLIANCE_APPROVED_STATUS:
            metrics['complianceApprovedVendors'] += 1
        if finance_status == FINANCE_APPROVED_STATUS:
            metrics['financeApprovedVendors'] += 1
        if workflow_status == ACTIVE_STATUS:
            metrics['activeVendors'] += 1
        if workflow_status == FINANCE_REJECTED_STATUS or workflow_status == 'Rejected':
            metrics['rejectedVendors'] += 1
        if workflow_status in {'Draft', 'Under Review', COMPLIANCE_APPROVED_STATUS, FINANCE_REVIEW_STATUS}:
            metrics['pendingReviews'] += 1

    total = metrics['totalVendors'] or 1
    metrics['approvalRate'] = round((metrics['activeVendors'] / total) * 100, 2)
    metrics['rejectionRate'] = round((metrics['rejectedVendors'] / total) * 100, 2)
    return metrics


def _admin_vendor_matches_filters(vendor, search_term='', status_filter='All', category_filter='All', region_filter='All'):
    workflow_status = _admin_current_workflow_status(vendor)
    if status_filter and status_filter != 'All' and workflow_status != status_filter:
        return False

    if category_filter and category_filter != 'All' and vendor.get('category', '') != category_filter:
        return False

    if region_filter and region_filter != 'All' and vendor.get('region', '') != region_filter:
        return False

    if search_term:
        haystack = ' '.join([
            str(vendor.get('companyName', '')),
            str(vendor.get('gstNumber', '')),
            str(vendor.get('panNumber', '')),
            str(vendor.get('contactPerson', '')),
            str(vendor.get('email', '')),
        ]).lower()
        if search_term.lower() not in haystack:
            return False

    return True


def _admin_audit_log_payload(audit_doc):
    payload = dict(audit_doc)
    payload['_id'] = str(payload['_id'])
    vendor_name = ''
    performed_by_name = ''

    vendor_ref = payload.get('vendorId')
    if isinstance(vendor_ref, ObjectId):
        vendor = db.vendors.find_one({'_id': vendor_ref})
        if vendor:
            vendor_name = vendor.get('companyName', '')
        payload['vendorId'] = str(vendor_ref)
    else:
        vendor = None
        if vendor_ref and ObjectId.is_valid(str(vendor_ref)):
            vendor = db.vendors.find_one({'_id': ObjectId(str(vendor_ref))})
        if vendor:
            vendor_name = vendor.get('companyName', '')

    performed_by = payload.get('performedBy', '')
    if performed_by and ObjectId.is_valid(str(performed_by)):
        user = db.users.find_one({'_id': ObjectId(str(performed_by))})
        if user:
            performed_by_name = user.get('full_name', '')

    payload['vendorName'] = vendor_name
    payload['performedByName'] = performed_by_name
    if isinstance(payload.get('timestamp'), datetime.datetime):
        payload['timestamp'] = payload['timestamp'].isoformat()
    return payload


def _write_admin_audit_log(vendor_id, action, performed_by):
    try:
        audit_doc = {
            'vendorId': ObjectId(vendor_id) if ObjectId.is_valid(str(vendor_id)) else str(vendor_id),
            'action': action,
            'performedBy': str(performed_by),
            'timestamp': datetime.datetime.utcnow(),
        }
        db.audit_logs.insert_one(audit_doc)
    except Exception as exc:
        print(f'ADMIN AUDIT DEBUG: failed action={action} vendor_id={vendor_id} error={repr(exc)}')


@app.route('/debug/ocr/validate', methods=['POST'])
def debug_ocr_validate():
    document_type = request.form.get('documentType') or request.json.get('documentType') if request.is_json else request.form.get('documentType')
    file_name = request.form.get('fileName') or (request.json.get('fileName') if request.is_json and request.json else '')
    file_data = None

    if 'file' in request.files:
        uploaded_file = request.files['file']
        file_name = file_name or uploaded_file.filename
        file_data = base64.b64encode(uploaded_file.read()).decode('utf-8')
    elif request.is_json:
        payload = request.get_json(silent=True) or {}
        file_data = payload.get('fileData')
        file_name = file_name or payload.get('fileName', '')
        document_type = document_type or payload.get('documentType')

    if not document_type:
        return jsonify({'message': 'Missing documentType'}), 400

    result = _run_ocr_for_document(document_type, file_data, file_name)
    return jsonify({
        'success': True,
        'documentType': document_type,
        'fileName': file_name,
        'rawOcrText': result.get('ocrText', ''),
        'extractedGST': result.get('extractedGST', ''),
        'extractedPAN': result.get('extractedPAN', ''),
        'extractedBusinessName': result.get('extractedBusinessName', ''),
        'extractedAddress': result.get('extractedAddress', ''),
        'ocrStatus': result.get('ocrStatus', 'Not Detected'),
        'ocrMatchStatus': result.get('ocrMatchStatus', 'Not Detected')
    }), 200

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1] # Expected: Bearer <token>
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # MongoDB uses _id which is an ObjectId
            current_user = db.users.find_one({"_id": ObjectId(data['id'])})
            if not current_user:
                raise Exception("User not found")
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('full_name'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    # Check if user already exists
    if db.users.find_one({"email": data['email']}):
        return jsonify({'message': 'User already exists'}), 400
    
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    
    new_user = {
        "full_name": data['full_name'],
        "email": data['email'],
        "password_hash": hashed_password,
        "role": data.get('role', 'Vendor'), # Default to Vendor if not provided
        "status": "Pending",
        "created_at": datetime.datetime.utcnow()
    }
    
    # Insert document into MongoDB
    db.users.insert_one(new_user)
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
        
    # Find user by email
    user = db.users.find_one({"email": data.get('email')})
    
    if user and check_password_hash(user['password_hash'], data.get('password')):
        # Encode stringified ObjectId into the token
        token = jwt.encode({
            'id': str(user['_id']),
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({'token': token, 'role': user['role'], 'full_name': user['full_name']})
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/profile', methods=['GET'])
@token_required
def profile(current_user):
    return jsonify({
        'id': str(current_user['_id']),
        'full_name': current_user['full_name'],
        'email': current_user['email'],
        'role': current_user['role'],
        'status': current_user.get('status', 'Pending')
    })

@app.route('/dashboard', methods=['GET'])
@token_required
def dashboard(current_user):
    # Role-based dashboard content placeholder
    content = {
        'Vendor': 'Welcome to the Vendor Dashboard. Here you will upload your documents.',
        'Compliance Officer': 'Welcome to the Compliance Dashboard. Here you will review vendor documents.',
        'Finance Team': 'Welcome to the Finance Dashboard. Here you will verify financial details.',
        'Super Admin': 'Welcome to the Admin Dashboard. Here you manage all users and settings.'
    }
    
    return jsonify({
        'message': content.get(current_user['role'], 'Welcome to your dashboard.'),
        'role': current_user['role']
    })

@app.route('/vendor/profile', methods=['GET'])
@token_required
def get_vendor_profile(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
    
    vendor = db.vendors.find_one({"userId": str(current_user['_id'])})
    if not vendor:
        return jsonify({'message': 'Profile not found'}), 404
    
    vendor['_id'] = str(vendor['_id'])
    return jsonify(vendor), 200


def _find_duplicate_vendor_profile(profile_data, exclude_user_id=None):
    clauses = []
    duplicate_fields = []

    gst_number = str(profile_data.get('gstNumber', '')).strip()
    if gst_number:
        clauses.append({'gstNumber': gst_number})

    pan_number = str(profile_data.get('panNumber', '')).strip()
    if pan_number:
        clauses.append({'panNumber': pan_number})

    email = str(profile_data.get('email', '')).strip()
    if email:
        clauses.append({'email': {'$regex': f'^{re.escape(email)}$', '$options': 'i'}})

    if not clauses:
        return None, duplicate_fields

    query = {'$or': clauses}
    if exclude_user_id is not None:
        query['userId'] = {'$ne': str(exclude_user_id)}

    duplicate = db.vendors.find_one(query)
    if not duplicate:
        return None, duplicate_fields

    if gst_number and duplicate.get('gstNumber') == gst_number:
        duplicate_fields.append('GST Number')
    if pan_number and duplicate.get('panNumber') == pan_number:
        duplicate_fields.append('PAN Number')
    if email and str(duplicate.get('email', '')).lower() == email.lower():
        duplicate_fields.append('Email')

    return duplicate, duplicate_fields

@app.route('/vendor/profile', methods=['POST'])
@token_required
def create_vendor_profile(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
        
    if db.vendors.find_one({"userId": str(current_user['_id'])}):
        return jsonify({'message': 'Profile already exists'}), 400
        
    data = request.get_json()
    required_fields = ['companyName', 'gstNumber', 'panNumber', 'contactPerson', 'phone', 'email', 'address', 'category', 'region']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400

    duplicate_vendor, duplicate_fields = _find_duplicate_vendor_profile(data)
    if duplicate_vendor:
        return jsonify({
            'message': 'Duplicate vendor detected. A vendor with the same ' + ', '.join(duplicate_fields) + ' already exists.',
            'success': False,
            'duplicateFields': duplicate_fields,
            'existingVendorId': str(duplicate_vendor['_id'])
        }), 409
        
    new_profile = {
        "userId": str(current_user['_id']),
        "companyName": data['companyName'],
        "gstNumber": data['gstNumber'],
        "panNumber": data['panNumber'],
        "contactPerson": data['contactPerson'],
        "phone": data['phone'],
        "email": data['email'],
        "address": data['address'],
        "category": data['category'],
        "region": data['region'],
        "status": "Draft",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    print(f"DEBUG: Inserting profile into DB={db.name}, Collection=vendors")
    db.vendors.insert_one(new_profile)
    inserted_id = new_profile.get('_id')
    
    return jsonify({
        'message': 'Profile created successfully',
        'success': True,
        'database': db.name,
        'collection': 'vendors',
        'inserted_id': str(inserted_id)
    }), 201

@app.route('/vendor/profile', methods=['PUT'])
@token_required
def update_vendor_profile(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    update_fields = {
        "companyName": data.get('companyName'),
        "gstNumber": data.get('gstNumber'),
        "panNumber": data.get('panNumber'),
        "contactPerson": data.get('contactPerson'),
        "phone": data.get('phone'),
        "email": data.get('email'),
        "address": data.get('address'),
        "category": data.get('category'),
        "region": data.get('region'),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    update_fields = {k: v for k, v in update_fields.items() if v is not None}

    current_vendor = db.vendors.find_one({"userId": str(current_user['_id'])})
    if not current_vendor:
        return jsonify({
            'message': 'Profile not found',
            'success': False,
            'database': db.name,
            'collection': 'vendors',
            'matched_count': 0,
            'modified_count': 0
        }), 404

    candidate_profile = dict(current_vendor)
    candidate_profile.update(update_fields)
    duplicate_vendor, duplicate_fields = _find_duplicate_vendor_profile(candidate_profile, exclude_user_id=current_user['_id'])
    if duplicate_vendor:
        return jsonify({
            'message': 'Duplicate vendor detected. A vendor with the same ' + ', '.join(duplicate_fields) + ' already exists.',
            'success': False,
            'duplicateFields': duplicate_fields,
            'existingVendorId': str(duplicate_vendor['_id'])
        }), 409
    
    print(f"DEBUG: Updating profile in DB={db.name}, Collection=vendors for User={current_user['_id']}")
    result = db.vendors.update_one(
        {"userId": str(current_user['_id'])},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        return jsonify({
            'message': 'Profile not found',
            'success': False,
            'database': db.name,
            'collection': 'vendors',
            'matched_count': 0,
            'modified_count': 0
        }), 404
        
    return jsonify({
        'message': 'Profile updated successfully',
        'success': True,
        'database': db.name,
        'collection': 'vendors',
        'matched_count': result.matched_count,
        'modified_count': result.modified_count
    }), 200

# ==========================================
# DAY 3: COMPLIANCE OFFICER APIS
# ==========================================

@app.route('/compliance/vendors', methods=['GET'])
@token_required
def get_all_vendors(current_user):
    if current_user['role'] != 'Compliance Officer':
        return jsonify({'message': 'Unauthorized'}), 403
        
    status_filter = request.args.get('status', 'All')
    search_term = request.args.get('search', '').strip()
    
    query = {}
    if status_filter != 'All':
        query['status'] = status_filter
        
    if search_term:
        query['$or'] = [
            {'companyName': {'$regex': search_term, '$options': 'i'}},
            {'email': {'$regex': search_term, '$options': 'i'}}
        ]

    # Use actual MongoDB data querying and sort newest first
    vendors_cursor = db.vendors.find(query).sort("createdAt", -1)
    vendors_list = []
    
    for v in vendors_cursor:
        v['_id'] = str(v['_id'])
        _, comparison = _get_vendor_document_summaries(v['_id'])
        v['ocrSummary'] = comparison
        vendors_list.append(v)
        
    return jsonify(vendors_list), 200

@app.route('/compliance/vendor/<vendor_id>', methods=['GET'])
@token_required
def get_vendor_detail(current_user, vendor_id):
    if current_user['role'] != 'Compliance Officer':
        return jsonify({'message': 'Unauthorized'}), 403
        
    try:
        vendor = db.vendors.find_one({"_id": ObjectId(vendor_id)})
        if not vendor:
            return jsonify({'message': 'Vendor profile not found'}), 404
        vendor['_id'] = str(vendor['_id'])
        documents, comparison = _get_vendor_document_summaries(vendor_id)
        vendor['documents'] = documents
        vendor['ocrSummary'] = comparison
        return jsonify(vendor), 200
    except Exception:
        return jsonify({'message': 'Invalid ID format'}), 400

@app.route('/compliance/vendor/<vendor_id>/<action>', methods=['PUT'])
@token_required
def process_vendor_action(current_user, vendor_id, action):
    if current_user['role'] != 'Compliance Officer':
        return jsonify({'message': 'Unauthorized'}), 403
        
    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400
        
    status_map = {
        'approve': 'Approved',
        'reject': 'Rejected',
        'correction': 'Correction Requested'
    }
    
    if action not in status_map:
        return jsonify({'message': 'Invalid action route'}), 400
        
    target_status = status_map[action]
    
    print(f"DEBUG: Setting Document {vendor_id} to {target_status} in DB={db.name}, Collection=vendors")
    
    try:
        result = db.vendors.update_one(
            {"_id": ObjectId(vendor_id)},
            {"$set": {
                "status": target_status, 
                "updatedAt": datetime.datetime.utcnow()
            }}
        )
        
        print(f"DEBUG: matched_count={result.matched_count}, modified_count={result.modified_count}")
        
        if result.matched_count == 0:
            return jsonify({
                'message': 'Vendor profile not found',
                'success': False,
                'database': db.name,
                'collection': 'vendors',
                'matched_count': 0,
                'modified_count': 0
            }), 404
            
        return jsonify({
            'message': f'Vendor status successfully updated to {target_status}', 
            'success': True,
            'database': db.name,
            'collection': 'vendors',
            'matched_count': result.matched_count,
            'modified_count': result.modified_count
        }), 200
    except Exception as e:
        print(f"DEBUG ERROR: {str(e)}")
        return jsonify({'message': 'Internal Server Error modifying document'}), 500


# ==========================================
# DAY 3.5: FINANCE TEAM APIS
# ==========================================

@app.route('/finance/vendors', methods=['GET'])
@token_required
def get_finance_vendors(current_user):
    if current_user['role'] != 'Finance Team':
        return jsonify({'message': 'Unauthorized'}), 403

    vendors_cursor = db.vendors.find({
        '$or': [
            {'status': {'$in': list(COMPLIANCE_APPROVED_STATUSES)}},
            {'complianceStatus': {'$in': list(COMPLIANCE_APPROVED_STATUSES)}},
        ]
    }).sort('updatedAt', -1)

    vendors_list = []
    for vendor in vendors_cursor:
        vendors_list.append({
            '_id': str(vendor['_id']),
            'companyName': vendor.get('companyName', ''),
            'gstNumber': vendor.get('gstNumber', ''),
            'panNumber': vendor.get('panNumber', ''),
            'contactPerson': vendor.get('contactPerson', ''),
            'phone': vendor.get('phone', ''),
            'email': vendor.get('email', ''),
            'category': vendor.get('category', ''),
            'region': vendor.get('region', ''),
            'status': vendor.get('status', ''),
            'complianceStatus': _normalize_compliance_status(vendor.get('complianceStatus') or vendor.get('status', '')),
            'financeStatus': vendor.get('financeStatus') or FINANCE_REVIEW_STATUS,
            'createdAt': vendor.get('createdAt').isoformat() if isinstance(vendor.get('createdAt'), datetime.datetime) else vendor.get('createdAt'),
            'updatedAt': vendor.get('updatedAt').isoformat() if isinstance(vendor.get('updatedAt'), datetime.datetime) else vendor.get('updatedAt'),
        })

    return jsonify(vendors_list), 200


@app.route('/finance/vendor/<vendor_id>', methods=['GET'])
@token_required
def get_finance_vendor_detail(current_user, vendor_id):
    if current_user['role'] != 'Finance Team':
        return jsonify({'message': 'Unauthorized'}), 403

    try:
        vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
        if not vendor:
            return jsonify({'message': 'Vendor profile not found'}), 404

        documents, comparison = _get_vendor_document_summaries(vendor_id)
        payload = _build_finance_vendor_payload(vendor, documents, comparison)
        return jsonify(payload), 200
    except Exception:
        return jsonify({'message': 'Invalid ID format'}), 400


@app.route('/finance/approve/<vendor_id>', methods=['PUT'])
@token_required
def approve_finance_vendor(current_user, vendor_id):
    if current_user['role'] != 'Finance Team':
        return jsonify({'message': 'Unauthorized'}), 403

    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400

    vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    if not vendor:
        return jsonify({'message': 'Vendor profile not found'}), 404

    documents, _ = _get_vendor_document_summaries(vendor_id)
    finance_errors = _finance_validation_errors(vendor, documents)
    if finance_errors:
        return jsonify({'success': False, 'message': 'Finance approval validation failed.', 'errors': finance_errors}), 400

    if not _is_compliance_approved(vendor.get('complianceStatus') or vendor.get('status', '')):
        return jsonify({'success': False, 'message': 'Vendor is not awaiting finance approval.'}), 400

    compliance_status = _normalize_compliance_status(vendor.get('complianceStatus') or vendor.get('status', ''))

    update_result = db.vendors.update_one(
        {'_id': ObjectId(vendor_id)},
        {'$set': {
            'complianceStatus': compliance_status,
            'financeStatus': FINANCE_APPROVED_STATUS,
            'status': ACTIVE_STATUS,
            'updatedAt': datetime.datetime.utcnow(),
        }}
    )

    if update_result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Vendor profile not found'}), 404

    _write_finance_audit_log(vendor_id, FINANCE_APPROVED_STATUS, current_user['_id'])

    updated_vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    payload = _build_finance_vendor_payload(updated_vendor, documents, None)
    payload['financeStatus'] = FINANCE_APPROVED_STATUS
    payload['complianceStatus'] = compliance_status

    return jsonify({
        'success': True,
        'message': 'Finance approved successfully.',
        'vendor': payload,
    }), 200


@app.route('/finance/reject/<vendor_id>', methods=['PUT'])
@token_required
def reject_finance_vendor(current_user, vendor_id):
    if current_user['role'] != 'Finance Team':
        return jsonify({'message': 'Unauthorized'}), 403

    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400

    vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    if not vendor:
        return jsonify({'message': 'Vendor profile not found'}), 404

    if not _is_compliance_approved(vendor.get('complianceStatus') or vendor.get('status', '')):
        return jsonify({'success': False, 'message': 'Vendor is not awaiting finance review.'}), 400

    compliance_status = _normalize_compliance_status(vendor.get('complianceStatus') or vendor.get('status', ''))
    update_result = db.vendors.update_one(
        {'_id': ObjectId(vendor_id)},
        {'$set': {
            'complianceStatus': compliance_status,
            'financeStatus': FINANCE_REJECTED_STATUS,
            'status': FINANCE_REJECTED_STATUS,
            'updatedAt': datetime.datetime.utcnow(),
        }}
    )

    if update_result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Vendor profile not found'}), 404

    _write_finance_audit_log(vendor_id, FINANCE_REJECTED_STATUS, current_user['_id'])

    updated_vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    documents, comparison = _get_vendor_document_summaries(vendor_id)
    payload = _build_finance_vendor_payload(updated_vendor, documents, comparison)
    payload['financeStatus'] = FINANCE_REJECTED_STATUS
    payload['complianceStatus'] = compliance_status

    return jsonify({
        'success': True,
        'message': 'Finance rejected successfully.',
        'vendor': payload,
    }), 200


# ==========================================
# DAY 6: SUPER ADMIN APIS
# ==========================================

@app.route('/admin/dashboard', methods=['GET'])
@token_required
def admin_dashboard(current_user):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    metrics = _admin_dashboard_metrics()
    return jsonify({
        'success': True,
        'counts': {
            'totalVendors': metrics['totalVendors'],
            'draftVendors': metrics['draftVendors'],
            'underReviewVendors': metrics['underReviewVendors'],
            'complianceApprovedVendors': metrics['complianceApprovedVendors'],
            'financeApprovedVendors': metrics['financeApprovedVendors'],
            'activeVendors': metrics['activeVendors'],
            'rejectedVendors': metrics['rejectedVendors'],
        },
        'analytics': {
            'totalVendors': metrics['totalVendors'],
            'activeVendors': metrics['activeVendors'],
            'approvalRate': metrics['approvalRate'],
            'rejectionRate': metrics['rejectionRate'],
            'pendingReviews': metrics['pendingReviews'],
        },
    }), 200


@app.route('/admin/vendors', methods=['GET'])
@token_required
def admin_vendors(current_user):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    search_term = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'All').strip() or 'All'
    category_filter = request.args.get('category', 'All').strip() or 'All'
    region_filter = request.args.get('region', 'All').strip() or 'All'

    vendors_cursor = db.vendors.find({}).sort('updatedAt', -1)
    vendors = []
    for vendor in vendors_cursor:
        if not _admin_vendor_matches_filters(vendor, search_term, status_filter, category_filter, region_filter):
            continue
        vendors.append(_admin_vendor_payload(vendor, include_documents=False))
    return jsonify(vendors), 200


@app.route('/admin/vendor/<vendor_id>', methods=['GET'])
@token_required
def admin_vendor_detail(current_user, vendor_id):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400

    vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    if not vendor:
        return jsonify({'message': 'Vendor profile not found'}), 404

    return jsonify(_admin_vendor_payload(vendor, include_documents=True)), 200


@app.route('/admin/audit-logs', methods=['GET'])
@token_required
def admin_audit_logs(current_user):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    logs_cursor = db.audit_logs.find({}).sort('timestamp', -1)
    logs = [_admin_audit_log_payload(log) for log in logs_cursor]
    return jsonify(logs), 200


@app.route('/admin/vendor/<vendor_id>/activate', methods=['PUT'])
@token_required
def admin_activate_vendor(current_user, vendor_id):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400

    vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    if not vendor:
        return jsonify({'success': False, 'message': 'Vendor profile not found'}), 404

    compliance_ok = _is_compliance_approved(vendor.get('complianceStatus') or vendor.get('status', ''))
    finance_ok = vendor.get('financeStatus') == FINANCE_APPROVED_STATUS
    if not compliance_ok or not finance_ok:
        return jsonify({'success': False, 'message': 'Vendor must be compliance approved and finance approved before activation.'}), 400

    current_status = vendor.get('status', '')
    if current_status == ACTIVE_STATUS:
        return jsonify({'success': True, 'message': 'Vendor is already active.'}), 200
    if current_status not in {INACTIVE_STATUS, FINANCE_APPROVED_STATUS}:
        return jsonify({'success': False, 'message': 'Vendor cannot be activated from the current status.'}), 400

    db.vendors.update_one(
        {'_id': ObjectId(vendor_id)},
        {'$set': {
            'status': ACTIVE_STATUS,
            'updatedAt': datetime.datetime.utcnow(),
        }}
    )
    _write_admin_audit_log(vendor_id, 'ADMIN_ACTIVATED_VENDOR', current_user['_id'])

    updated_vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    return jsonify({
        'success': True,
        'message': 'Vendor activated successfully.',
        'vendor': _admin_vendor_payload(updated_vendor, include_documents=True),
    }), 200


@app.route('/admin/vendor/<vendor_id>/deactivate', methods=['PUT'])
@token_required
def admin_deactivate_vendor(current_user, vendor_id):
    if current_user['role'] != 'Super Admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if not ObjectId.is_valid(vendor_id):
        return jsonify({'message': 'Invalid Vendor ID format'}), 400

    vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    if not vendor:
        return jsonify({'success': False, 'message': 'Vendor profile not found'}), 404

    current_status = vendor.get('status', '')
    if current_status == INACTIVE_STATUS:
        return jsonify({'success': True, 'message': 'Vendor is already inactive.'}), 200
    if current_status not in {ACTIVE_STATUS, FINANCE_APPROVED_STATUS}:
        return jsonify({'success': False, 'message': 'Vendor cannot be deactivated from the current status.'}), 400

    db.vendors.update_one(
        {'_id': ObjectId(vendor_id)},
        {'$set': {
            'status': INACTIVE_STATUS,
            'updatedAt': datetime.datetime.utcnow(),
        }}
    )
    _write_admin_audit_log(vendor_id, 'ADMIN_DEACTIVATED_VENDOR', current_user['_id'])

    updated_vendor = db.vendors.find_one({'_id': ObjectId(vendor_id)})
    return jsonify({
        'success': True,
        'message': 'Vendor deactivated successfully.',
        'vendor': _admin_vendor_payload(updated_vendor, include_documents=True),
    }), 200

# ==========================================
# DAY 4: VENDOR DOCUMENTS APIS
# ==========================================

@app.route('/vendor/document', methods=['POST'])
@token_required
def upload_vendor_document(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
        
    data = request.get_json()
    if not data or not data.get('documentType') or not data.get('fileName'):
        return jsonify({'message': 'Missing required fields'}), 400
        
    # Overwrite/delete any existing document of the same type for this vendor
    old_docs = list(db.documents.find({
        "vendorId": current_user['_id'],
        "documentType": data['documentType']
    }))
    for old_doc in old_docs:
        if old_doc.get('s3Key'):
            _s3_delete(old_doc['s3Key'])
    db.documents.delete_many({
        "vendorId": current_user['_id'],
        "documentType": data['documentType']
    })
    
    new_doc = {
        "vendorId": current_user['_id'],
        "documentType": data['documentType'],
        "fileName": data['fileName'],
        "uploadDate": datetime.datetime.utcnow(),
        "status": "Uploaded",
        "ocrStatus": "Not Detected"
    }

    fd = data.get('fileData')
    s3_key = None
    if fd:
        try:
            raw = fd.split(',', 1)[1] if ',' in fd else fd
            file_bytes = base64.b64decode(raw)
            ext = data['fileName'].rsplit('.', 1)[-1] if '.' in data['fileName'] else 'bin'
            content_type = 'application/pdf' if ext.lower() == 'pdf' else 'image/png' if ext.lower() in ('png',) else 'image/jpeg'
            s3_key = _s3_upload(file_bytes, data['fileName'], content_type)
            if s3_key:
                new_doc['s3Key'] = s3_key
                new_doc['fileUrl'] = _s3_presigned_url(s3_key)
        except Exception as e:
            print(f'S3 upload error: {e}', flush=True)

    ocr_result = _run_ocr_for_document(data['documentType'], fd, data['fileName'])
    new_doc.update(ocr_result)

    if data['documentType'] == 'GST Certificate' and new_doc.get('extractedGST'):
        new_doc['ocrExtractedValue'] = new_doc['extractedGST']
    if data['documentType'] == 'PAN Card' and new_doc.get('extractedPAN'):
        new_doc['ocrExtractedValue'] = new_doc['extractedPAN']
    
    db.documents.insert_one(new_doc)
    
    return jsonify({
        'message': 'Document uploaded successfully',
        'success': True,
        'document': {
            'id': str(new_doc['_id']),
            'documentType': new_doc['documentType'],
            'fileName': new_doc['fileName'],
            'status': new_doc['status'],
            'fileUrl': new_doc.get('fileUrl', ''),
            'ocrStatus': new_doc.get('ocrStatus', 'Not Detected'),
            'ocrExtractedValue': new_doc.get('ocrExtractedValue', ''),
            'extractedGST': new_doc.get('extractedGST', ''),
            'extractedPAN': new_doc.get('extractedPAN', ''),
            'extractedBusinessName': new_doc.get('extractedBusinessName', ''),
            'extractedAddress': new_doc.get('extractedAddress', ''),
            'ocrMatchStatus': new_doc.get('ocrMatchStatus', 'Not Detected'),
            'uploadDate': new_doc['uploadDate'].isoformat()
        }
    }), 201

@app.route('/vendor/documents', methods=['GET'])
@token_required
def get_vendor_documents(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
        
    docs_cursor = db.documents.find({"vendorId": current_user['_id']})
    docs_list = []
    for doc in docs_cursor:
        doc.pop('fileData', None)
        doc['_id'] = str(doc['_id'])
        doc['vendorId'] = str(doc['vendorId'])
        if doc.get('s3Key'):
            doc['fileUrl'] = _s3_presigned_url(doc['s3Key']) or doc.get('fileUrl', '')
        if 'uploadDate' in doc and isinstance(doc['uploadDate'], datetime.datetime):
            doc['uploadDate'] = doc['uploadDate'].isoformat()
        docs_list.append(doc)
        
    return jsonify(docs_list), 200

@app.route('/vendor/document/<doc_id>', methods=['DELETE'])
@token_required
def delete_vendor_document(current_user, doc_id):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403
        
    if not ObjectId.is_valid(doc_id):
        return jsonify({'message': 'Invalid Document ID format'}), 400
        
    doc = db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        return jsonify({'message': 'Document not found'}), 404
        
    if doc['vendorId'] != current_user['_id']:
        return jsonify({'message': 'Unauthorized'}), 403
        
    if doc.get('s3Key'):
        _s3_delete(doc['s3Key'])
    db.documents.delete_one({"_id": ObjectId(doc_id)})
    return jsonify({'message': 'Document deleted successfully', 'success': True}), 200

@app.route('/debug/ocr/status', methods=['GET'])
def debug_ocr_status():
    tesseract_available = pytesseract is not None
    tesseract_version = ''
    if tesseract_available:
        try:
            tesseract_version = str(pytesseract.get_tesseract_version())
        except Exception as e:
            tesseract_version = f'error: {e}'
    return jsonify({
        'tesseract_available': tesseract_available,
        'tesseract_version': tesseract_version,
        'tesseract_binary': pytesseract.pytesseract.tesseract_cmd if tesseract_available else 'N/A',
        'fitz_available': fitz is not None,
    }), 200


@app.route('/admin/reprocess-ocr', methods=['POST'])
@token_required
def reprocess_ocr(current_user):
    if current_user['role'] not in ['Compliance Officer', 'Super Admin']:
        return jsonify({'message': 'Unauthorized'}), 403

    if not pytesseract:
        return jsonify({'success': False, 'message': 'Tesseract OCR is not available on server'}), 400

    docs_cursor = db.documents.find({
        'documentType': {'$in': ['GST Certificate', 'PAN Card']},
        '$or': [
            {'ocrStatus': {'$in': [None, '', 'Not Detected']}},
            {'ocrStatus': {'$exists': False}}
        ]
    })
    docs_list = list(docs_cursor)
    total = len(docs_list)
    reprocessed = 0
    errors = []

    for doc in docs_list:
        doc_id = doc['_id']
        fd = doc.get('fileData')
        if not fd:
            errors.append(f'{doc_id}: no fileData stored, cannot reprocess')
            continue
        try:
            result = _run_ocr_for_document(doc['documentType'], fd, doc.get('fileName', 'unknown'))
            db.documents.update_one({'_id': doc_id}, {'$set': result})
            if result.get('ocrStatus') == 'Detected':
                reprocessed += 1
            else:
                errors.append(f'{doc_id}: OCR returned status={result.get("ocrStatus")}')
        except Exception as e:
            errors.append(f'{doc_id}: {repr(e)}')

    updated_vendors = 0
    for v in db.vendors.find({}):
        db.vendors.update_one({'_id': v['_id']}, {'$unset': {'ocrSummary': ''}})
        updated_vendors += 1

    return jsonify({
        'success': True,
        'total_documents': total,
        'reprocessed_successfully': reprocessed,
        'errors_count': len(errors),
        'errors': errors[:20],
        'vendors_cache_cleared': updated_vendors
    }), 200


# ------------------------------------------
# Vendor Submit for Review Endpoint
# ------------------------------------------
@app.route('/vendor/submit-review', methods=['POST'])
@token_required
def submit_review(current_user):
    if current_user['role'] != 'Vendor':
        return jsonify({'message': 'Unauthorized'}), 403

    # Find vendor profile linked to the user
    vendor = db.vendors.find_one({'userId': str(current_user['_id'])})
    if not vendor:
        return jsonify({'success': False, 'message': 'Vendor profile not completed.'}), 400

    # Verify required documents are uploaded
    required_docs = ['GST Certificate', 'PAN Card', 'Trade License', 'Bank Proof', 'Insurance Certificate']
    docs_cursor = db.documents.find({'vendorId': current_user['_id']})
    uploaded_doc_types = {doc.get('documentType') for doc in docs_cursor}
    if not set(required_docs).issubset(uploaded_doc_types):
        return jsonify({'success': False, 'message': 'Required documents are missing.'}), 400

    # Update vendor status to Under Review
    db.vendors.update_one(
        {'_id': vendor['_id']},
        {'$set': {
            'status': 'Under Review',
            'updatedAt': datetime.datetime.utcnow()
        }}
    )
    return jsonify({'success': True, 'message': 'Application submitted for compliance review.'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
