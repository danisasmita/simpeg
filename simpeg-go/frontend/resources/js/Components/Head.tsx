import { useEffect } from 'react';

const appName = import.meta.env.VITE_APP_NAME || 'SIMPEG UML';

export default function Head({ title }: { title?: string }) {
    useEffect(() => {
        if (title) {
            document.title = `${title} - ${appName}`;
        } else {
            document.title = appName;
        }
    }, [title]);

    return null;
}