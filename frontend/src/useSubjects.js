import { useEffect, useState } from 'react';
import { apiFetch } from './api';

// Custom hook: loads the subject list once. Used by the dropdowns on several pages.
export default function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  useEffect(() => {
    apiFetch('/subjects').then((res) => res.success && setSubjects(res.data));
  }, []);
  return subjects;
}
