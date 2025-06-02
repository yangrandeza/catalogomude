// SCORM 1.2 API Implementation for the LMS

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

// This will hold the SCORM data fetched from the backend or set by the SCO.
// It should be initialized with data for the current user and course.
let lmsData: Record<string, string> = {};
let currentCourseId: string | null = null; // Should be set when a course is launched
let currentUserId: string | null = null;   // Should be set based on logged-in user

let lastError = '0'; // No Error
let isInitialized = false;

const API_BASE_URL = '/api/scorm'; // Adjust if your backend API route is different

// --- Backend Helper Functions (to be implemented or expanded) ---
async function fetchScormData(courseId: string, userId: string): Promise<Record<string, string>> {
  console.log(`[LMS API] Fetching SCORM data for course ${courseId}, user ${userId}`);
  // TODO: Implement actual fetch call to your backend
  // Example:
  // const response = await fetch(`${API_BASE_URL}/data?courseId=${courseId}&userId=${userId}`);
  // if (!response.ok) {
  //   throw new Error('Failed to fetch SCORM data');
  // }
  // return response.json();

  // For now, return some default/empty data
  return {
    'cmi.core.student_id': userId,
    'cmi.core.student_name': 'LMS User', // Fetch actual name
    'cmi.core.lesson_location': '',
    'cmi.core.credit': 'credit',
    'cmi.core.lesson_status': 'not attempted',
    'cmi.core.entry': 'ab-initio',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '0',
    'cmi.core.score.max': '100',
    'cmi.core.total_time': '00:00:00',
    'cmi.core.lesson_mode': 'normal',
    'cmi.suspend_data': '',
    'cmi.launch_data': '', // This should come from the manifest or LMS settings
    'cmi.comments': '',
  };
}

async function persistScormData(courseId: string, userId: string, data: Record<string, string>): Promise<boolean> {
  console.log(`[LMS API] Persisting SCORM data for course ${courseId}, user ${userId}:`, data);
  // TODO: Implement actual fetch call to your backend
  // Example:
  // const response = await fetch(`${API_BASE_URL}/data`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ courseId, userId, data }),
  // });
  // return response.ok;
  return true; // Assume success for now
}

// --- SCORM API Methods ---
const LMS: ScormApi = {
  LMSInitialize: (param: string): string => {
    console.log('[LMS API] LMSInitialize(' + param + ')');
    if (!currentCourseId || !currentUserId) {
      console.error('[LMS API] LMSInitialize failed: Course ID or User ID not set.');
      lastError = '101'; // General Exception
      return 'false';
    }
    if (isInitialized) {
      console.warn('[LMS API] LMSInitialize called more than once.');
      // SCORM 1.2 spec says this is not an error, but good to note.
    }

    // Fetch initial data from backend
    fetchScormData(currentCourseId, currentUserId)
      .then(data => {
        lmsData = data;
        // If cmi.core.entry is 'resume', lesson_status should not be overridden to 'incomplete'
        if (lmsData['cmi.core.entry'] !== 'resume') {
            lmsData['cmi.core.lesson_status'] = lmsData['cmi.core.lesson_status'] || 'incomplete';
        }
        isInitialized = true;
        lastError = '0';
        console.log('[LMS API] LMSInitialize successful. Data loaded:', lmsData);
      })
      .catch(error => {
        console.error('[LMS API] Error fetching SCORM data during Initialize:', error);
        lastError = '101'; // General Exception
        // Note: LMSInitialize is synchronous, so we can't directly return 'false' from the async catch.
        // The SCO will likely call LMSGetLastError.
      });
    
    // LMSInitialize is synchronous. If fetchScormData fails, isInitialized remains false.
    // The SCO should check LMSGetLastError. For now, we assume it will become true.
    // A more robust solution might involve a loading state or pre-fetching.
    if (!isInitialized && Object.keys(lmsData).length === 0) { // If fetch hasn't populated yet
        // Provide minimal defaults so SCO doesn't immediately fail
        lmsData = { 
            'cmi.core.lesson_status': 'incomplete', 
            'cmi.core.student_id': currentUserId,
            // ... other critical defaults
        };
    }
    isInitialized = true; // Optimistically set, or handle sync/async better
    lastError = '0';
    return 'true';
  },

  LMSFinish: (param: string): string => {
    console.log('[LMS API] LMSFinish(' + param + ')');
    if (!isInitialized) {
      lastError = '301'; // Not Initialized
      return 'false';
    }
    // Persist data one last time
    if (currentCourseId && currentUserId) {
      LMS.LMSCommit(''); // Ensure data is saved
    }
    isInitialized = false;
    lastError = '0';
    console.log('[LMS API] LMSFinish successful.');
    return 'true';
  },

  LMSGetValue: (element: string): string => {
    console.log(`[LMS API] LMSGetValue(${element})`);
    if (!isInitialized) {
      lastError = '301'; // Not Initialized
      return '';
    }
    if (lmsData.hasOwnProperty(element)) {
      lastError = '0';
      console.log(`  Returning: ${lmsData[element]}`);
      return lmsData[element];
    }
    lastError = '401'; // Undefined Data Model Element (Using SCORM 2004's "Not Implemented" for simplicity)
    console.warn(`  Element not found: ${element}`);
    return '';
  },

  LMSSetValue: (element: string, value: string): string => {
    console.log(`[LMS API] LMSSetValue(${element}, ${value})`);
    if (!isInitialized) {
      lastError = '301'; // Not Initialized
      return 'false';
    }

    // Basic Read-only checks (can be expanded)
    const readOnlyElements = [
      'cmi.core.student_id', 'cmi.core.student_name', 'cmi.core.credit', 
      'cmi.core.lesson_mode', 'cmi.launch_data', 'cmi.core.score.min', 'cmi.core.score.max'
    ];
    if (readOnlyElements.includes(element)) {
      lastError = '403'; // Element is read only
      console.warn(` Attempt to set read-only element: ${element}`);
      return 'false';
    }

    lmsData[element] = value;
    lastError = '0';
    console.log(`  Set ${element} to ${value}. Current data:`, lmsData);
    // Optionally, you could auto-commit certain critical values or queue for commit.
    return 'true';
  },

  LMSCommit: (param: string): string => {
    console.log('[LMS API] LMSCommit(' + param + ')');
    if (!isInitialized) {
      lastError = '301'; // Not Initialized
      return 'false';
    }
    if (!currentCourseId || !currentUserId) {
      console.error('[LMS API] LMSCommit failed: Course ID or User ID not set.');
      lastError = '101'; // General Exception
      return 'false';
    }

    persistScormData(currentCourseId, currentUserId, lmsData)
      .then(success => {
        if (success) {
          lastError = '0';
          console.log('[LMS API] LMSCommit successful. Data persisted.');
        } else {
          lastError = '101'; // General Exception (Failed to persist)
          console.error('[LMS API] LMSCommit failed to persist data.');
        }
      })
      .catch(error => {
        console.error('[LMS API] Error during LMSCommit data persistence:', error);
        lastError = '101';
      });
    // LMSCommit is synchronous. Similar to LMSInitialize, error handling for async op needs care.
    return 'true'; // Assume optimistic success for sync return
  },

  LMSGetLastError: (): string => {
    // console.log('[LMS API] LMSGetLastError() - returning: ' + lastError);
    return lastError;
  },

  LMSGetErrorString: (errorCode: string): string => {
    // console.log('[LMS API] LMSGetErrorString(' + errorCode + ')');
    const errorStrings: Record<string, string> = {
      '0': 'No Error',
      '101': 'General Exception',
      '201': 'Invalid argument error',
      '301': 'Not initialized',
      '401': 'Not implemented error / Undefined Data Model Element',
      '403': 'Element is read only',
      // Add more SCORM 1.2 error codes as needed
    };
    return errorStrings[errorCode] || 'Unknown Error Code';
  },

  LMSGetDiagnostic: (errorCode: string): string => {
    // console.log('[LMS API] LMSGetDiagnostic(' + errorCode + ')');
    return 'LMS Diagnostic information for error code ' + errorCode;
  },
};

export const initializeLMSAPIService = (courseId: string, userId: string) => {
  if (typeof window !== 'undefined') {
    currentCourseId = courseId;
    currentUserId = userId;
    lmsData = {}; // Reset data for new course/user
    isInitialized = false; // Reset initialization state
    (window as any).API = LMS;
    console.log(`[LMS API Service] SCORM 1.2 API (window.API) initialized for course ${courseId}, user ${userId}.`);
  } else {
    console.error('[LMS API Service] Cannot initialize: window is not defined.');
  }
};

// Helper to be called when course player unloads or user navigates away
export const resetLMSAPIService = () => {
    if (typeof window !== 'undefined') {
        if (isInitialized) {
            LMS.LMSFinish(''); // Attempt to finish if still initialized
        }
        (window as any).API = undefined; // Remove API from window
        currentCourseId = null;
        currentUserId = null;
        lmsData = {};
        isInitialized = false;
        console.log('[LMS API Service] SCORM API (window.API) has been reset and removed.');
    }
};
