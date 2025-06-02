// Basic SCORM 1.2 API Mock Implementation

interface ScormApi {
  LMSInitialize: (param: string) => string;
  LMSFinish: (param: string) => string;
  LMSGetValue: (element: string) => string;
  LMSSetValue: (element: string, value: string) => string;
  LMSCommit: (param: string) => string;
  LMSGetLastError: () => string;
  LMSGetErrorString: (errorCode: string) => string;
  LMSGetDiagnostic: (errorCode: string) => string;
}

const scormData: Record<string, string> = {
  'cmi.core.student_id': '12345',
  'cmi.core.student_name': 'Student, Joe',
  'cmi.core.lesson_location': '',
  'cmi.core.credit': 'credit',
  'cmi.core.lesson_status': 'not attempted', // Possible values: passed, completed, failed, incomplete, browsed, not attempted
  'cmi.core.entry': 'ab-initio', // ab-initio, resume, ''
  'cmi.core.score.raw': '',
  'cmi.core.score.min': '0',
  'cmi.core.score.max': '100',
  'cmi.core.total_time': '0000:00:00',
  'cmi.core.lesson_mode': 'normal', // normal, review, browse
  'cmi.suspend_data': '',
  'cmi.launch_data': '', // Data from the LMS manifest
  'cmi.comments': '',
  // Add other SCORM 1.2 data model elements as needed
};

let lastError = '0'; // No Error

const API: ScormApi = {
  LMSInitialize: (param: string): string => {
    console.log('[SCORM API Mock] LMSInitialize(' + param + ')');
    lastError = '0';
    // Check if already initialized? SCORM 1.2 spec says "May be called multiple times"
    // but good practice to handle it. For a mock, this is fine.
    scormData['cmi.core.lesson_status'] = 'incomplete'; // Default status on init
    return 'true';
  },

  LMSFinish: (param: string): string => {
    console.log('[SCORM API Mock] LMSFinish(' + param + ')');
    lastError = '0';
    // Perform any cleanup if necessary
    return 'true';
  },

  LMSGetValue: (element: string): string => {
    console.log('[SCORM API Mock] LMSGetValue(' + element + ')');
    lastError = '0';
    if (scormData.hasOwnProperty(element)) {
      console.log(`  Returning: ${scormData[element]}`);
      return scormData[element];
    }
    lastError = '401'; // Undefined Data Model Element
    console.warn(`  Element not found: ${element}`);
    return '';
  },

  LMSSetValue: (element: string, value: string): string => {
    console.log(`[SCORM API Mock] LMSSetValue(${element}, ${value})`);
    lastError = '0';
    // Basic validation for some elements could be added here
    // e.g., cmi.core.lesson_status can only be certain values
    scormData[element] = value;
    return 'true';
  },

  LMSCommit: (param: string): string => {
    console.log('[SCORM API Mock] LMSCommit(' + param + ')');
    lastError = '0';
    // In a real LMS, this would persist data. For a mock, we can just log.
    console.log('  Data committed (mock):', JSON.stringify(scormData));
    return 'true';
  },

  LMSGetLastError: (): string => {
    console.log('[SCORM API Mock] LMSGetLastError() - returning: ' + lastError);
    return lastError;
  },

  LMSGetErrorString: (errorCode: string): string => {
    console.log('[SCORM API Mock] LMSGetErrorString(' + errorCode + ')');
    const errorStrings: Record<string, string> = {
      '0': 'No Error',
      '101': 'General Exception',
      '201': 'Invalid argument error',
      '202': 'Element cannot have children',
      '203': 'Element not an array. Cannot have count.',
      '301': 'Not initialized',
      '401': 'Not implemented error', // Used for Undefined Data Model Element in this mock
      '402': 'Invalid set value, element is a keyword',
      '403': 'Element is read only',
      '404': 'Element is write only',
      '405': 'Incorrect Data Type',
    };
    return errorStrings[errorCode] || 'Unknown Error Code';
  },

  LMSGetDiagnostic: (errorCode: string): string => {
    console.log('[SCORM API Mock] LMSGetDiagnostic(' + errorCode + ')');
    // Provide more detailed diagnostic information if available
    return 'Diagnostic information for error code ' + errorCode;
  },
};

export const initializeScormAPI = () => {
  if (typeof window !== 'undefined') {
    (window as any).API = API;
    console.log('[SCORM API Mock] SCORM 1.2 API (window.API) initialized.');
  }
};

// Expose data for debugging or direct manipulation if needed (use with caution)
export const getScormData = () => scormData;
export const setScormDataItem = (key: string, value: string) => {
  scormData[key] = value;
};
