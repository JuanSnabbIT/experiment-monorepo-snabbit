import { useEffect, useState } from 'react';
import themeConfig from '../config/theme.config';

const useDocumentTitle = ({
        title = themeConfig.projectTitle,
        name = themeConfig.projectName,
}: {
	/**
	 * Project Name
	 *
	 * Example: Project Name | Page Name
	 */
	title?: string;
	/**
	 * Page Name
	 *
	 * Example: Project Name | Page Name
	 */
	name?: string;
}) => {
        const computeTitle = (t: string, n: string) => {
                if (t && n && t !== n) return `${n} | ${t}`;
                return n || t;
        };

        const [documentTitle, setDocumentTitle] = useState<string>(() => computeTitle(title, name));

        useEffect(() => {
                const newTitle = computeTitle(title, name);
                setDocumentTitle(newTitle);
                document.title = newTitle;
        }, [title, name]);

        return [documentTitle, setDocumentTitle];
};

export default useDocumentTitle;
