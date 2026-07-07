import { partnerApiClient } from './partnerClient';
import { parseBlobError } from '@/lib/documentFile';

export interface PartnerPortalDocument {
  documentId: string;
  partnerId: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  status?: string | null;
  uploadedAt?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export const partnerDocumentsApi = {
  list: async () => {
    const { data } = await partnerApiClient.get<{ documents: PartnerPortalDocument[] }>(
      '/partner-documents'
    );
    return data;
  },

  upload: async (input: {
    documentType: string;
    documentName: string;
    file: File;
    expiryDate?: string;
    notes?: string;
  }) => {
    const formData = new FormData();
    formData.append('documentType', input.documentType);
    formData.append('documentName', input.documentName);
    formData.append('file', input.file);
    if (input.expiryDate) formData.append('expiryDate', input.expiryDate);
    if (input.notes) formData.append('notes', input.notes);

    const { data } = await partnerApiClient.post<{ document: PartnerPortalDocument }>(
      '/partner-documents/upload',
      formData
    );
    return data;
  },

  fetchDocumentContent: async (documentId: string): Promise<Blob> => {
    const { data, headers, status } = await partnerApiClient.get<Blob>(
      `/partner-documents/${documentId}/content`,
      { responseType: 'blob' }
    );
    const contentType = headers['content-type'] || '';
    if (status >= 400) {
      await parseBlobError(data, contentType);
    }
    if (contentType.includes('application/json') || data.type.includes('json')) {
      await parseBlobError(data, contentType);
    }
    return data;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await partnerApiClient.delete(`/partner-documents/${documentId}`);
  },
};
