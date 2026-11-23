import { handleApiCall } from './apiErrorHandler';

export const studentService = {
  /**
   * Fetch paginated student directory with optional filters
   * @param {Object} [params] - { branch, status, search, page, limit, fields }
   */
  getStudents: async (params = {}) => {
    return handleApiCall('get', '/students', params);
  },

  /**
   * Fetch full Student 360° profile by ID
   * @param {string} id - MongoDB ObjectId
   */
  getStudentById: async (id) => {
    return handleApiCall('get', `/students/${id}`);
  },

  /**
   * Directly create a new Student profile
   * @param {Object} studentData
   */
  createStudent: async (studentData) => {
    return handleApiCall('post', '/students', studentData);
  },

  /**
   * Update Student profile sections
   * @param {string} id - MongoDB ObjectId
   * @param {Object} updateData - Partial profile update
   */
  updateStudent: async (id, updateData) => {
    return handleApiCall('patch', `/students/${id}`, updateData);
  },

  /**
   * Add consultation note to Student timeline
   * @param {string} id - MongoDB ObjectId
   * @param {Object} noteData - { content, category }
   */
  addStudentNote: async (id, noteData) => {
    return handleApiCall('post', `/students/${id}/notes`, noteData);
  },

  /**
   * Convert an admissions pipeline candidate into a Student 360° profile
   * @param {Object} conversionPayload - { leadId, conversionNotes, additionalProfileData }
   */
  convertLead: async (conversionPayload) => {
    return handleApiCall('post', '/students/convert-lead', conversionPayload);
  },

  /**
   * Update student vault document metadata or replace file (Cloudflare R2 synchronized)
   * @param {string} studentId
   * @param {string} docId
   * @param {Object} payload - { title, category, fileBase64, fileName, fileSize, mimeType }
   */
  updateDocument: async (studentId, docId, payload) => {
    return handleApiCall('put', `/students/${studentId}/vault/${docId}`, payload);
  },

  /**
   * Delete student vault document and purge from Cloudflare R2
   * @param {string} studentId
   * @param {string} docId
   * @param {boolean} [permanent=false]
   */
  deleteDocument: async (studentId, docId, permanent = false) => {
    return handleApiCall('delete', `/students/${studentId}/vault/${docId}${permanent ? '?purge=true' : ''}`);
  },
};
