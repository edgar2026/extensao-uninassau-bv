/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppProviders from './app/providers';
import AppRouter from './app/router';

/**
 * Application entry point.
 * - AppProviders wraps QueryClient + AuthContext
 * - AppRouter contains all route definitions driven by feature barrel exports
 */
export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AppProviders>
  );
}
