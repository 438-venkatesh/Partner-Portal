import { apiClient } from './client';

export interface ReportEntity {
  key: string;
  label: string;
  columns: string[];
}

export const reportsApi = {
  listEntities: async () => {
    const { data } = await apiClient.get<{ entities: ReportEntity[] }>('/reports/entities');
    return data.entities;
  },

  downloadCsv: async (
    entity: string,
    filters: { status?: string; dateFrom?: string; dateTo?: string; columns?: string[] }
  ) => {
    const response = await apiClient.get<string>(`/reports/${entity}/export`, {
      responseType: 'blob' as any,
      params: {
        status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        columns: filters.columns?.length ? filters.columns.join(',') : undefined,
      },
    });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${entity}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
