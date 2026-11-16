import { createContext } from 'react';

/** Only request/payment forms disable submission in demo; search remains interactive. */
export const SubmissionDisabledContext = createContext(false);
