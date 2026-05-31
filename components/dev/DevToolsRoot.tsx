'use client';

/**
 * DevToolsRoot - Client Boundary for Dev-Only Tools
 * ==================================================
 * This wrapper provides a proper client boundary for dev tools
 * that must be imported into the Server Component layout.
 * 
 * SECURITY: Returns null in production - zero overhead.
 */

import dynamic from 'next/dynamic';

const OmniInspector = dynamic(() => import('./OmniInspector').then(mod => mod.OmniInspector), { ssr: false });

export function DevToolsRoot() {
    // Return null in production - no rendering, no overhead
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <OmniInspector />
    );
}
