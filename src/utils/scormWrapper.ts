// SCORM API wrapper utilities
let scormVersion: '1.2' | '2004' | null = null;

// Initialize SCORM API connection
export const initializeScormWrapper = (): boolean => {
  try {
    // First try SCORM 2004
    if (typeof window.pipwerks !== 'undefined') {
      window.pipwerks.SCORM.version = "2004";
      if (window.pipwerks.SCORM.init()) {
        scormVersion = "2004";
        return true;
      }

      // If 2004 fails, try SCORM 1.2
      window.pipwerks.SCORM.version = "1.2";
      if (window.pipwerks.SCORM.init()) {
        scormVersion = "1.2";
        return true;
      }
    }
    
    console.error('SCORM API not found');
    return false;
  } catch (error) {
    console.error('Error initializing SCORM API:', error);
    return false;
  }
};

// Terminate SCORM API connection
export const terminateScormWrapper = (): boolean => {
  try {
    if (typeof window.pipwerks !== 'undefined') {
      return window.pipwerks.SCORM.quit();
    }
    return false;
  } catch (error) {
    console.error('Error terminating SCORM API:', error);
    return false;
  }
};

// Get a SCORM data model element value
export const getScormValue = (parameter: string): string => {
  try {
    if (typeof window.pipwerks !== 'undefined') {
      return window.pipwerks.SCORM.get(parameter);
    }
    return '';
  } catch (error) {
    console.error('Error getting SCORM value:', error);
    return '';
  }
};

// Set a SCORM data model element value
export const setScormValue = (parameter: string, value: string): boolean => {
  try {
    if (typeof window.pipwerks !== 'undefined') {
      return window.pipwerks.SCORM.set(parameter, value);
    }
    return false;
  } catch (error) {
    console.error('Error setting SCORM value:', error);
    return false;
  }
};

// Save current state
export const saveScormState = (): boolean => {
  try {
    if (typeof window.pipwerks !== 'undefined') {
      return window.pipwerks.SCORM.save();
    }
    return false;
  } catch (error) {
    console.error('Error saving SCORM state:', error);
    return false;
  }
};

// Get the current completion status
export const getCompletionStatus = (): string => {
  const parameter = scormVersion === "2004" ? "cmi.completion_status" : "cmi.core.lesson_status";
  return getScormValue(parameter);
};

// Set the completion status
export const setCompletionStatus = (status: 'completed' | 'incomplete' | 'not attempted'): boolean => {
  const parameter = scormVersion === "2004" ? "cmi.completion_status" : "cmi.core.lesson_status";
  return setScormValue(parameter, status);
};

// Get the current score
export const getScore = (): string => {
  const parameter = scormVersion === "2004" ? "cmi.score.raw" : "cmi.core.score.raw";
  return getScormValue(parameter);
};

// Set the score
export const setScore = (score: number): boolean => {
  const parameter = scormVersion === "2004" ? "cmi.score.raw" : "cmi.core.score.raw";
  return setScormValue(parameter, score.toString());
};

// Add TypeScript definitions for the SCORM wrapper
declare global {
  interface Window {
    pipwerks: {
      SCORM: {
        version: string;
        init: () => boolean;
        quit: () => boolean;
        get: (parameter: string) => string;
        set: (parameter: string, value: string) => boolean;
        save: () => boolean;
        status: (action: string, status?: string) => string | boolean;
      };
    };
  }
}