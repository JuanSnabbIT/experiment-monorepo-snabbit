import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../../../components/ui/Button';
import HelpDrawer from '../../../../components/HelpDrawer';
import { resolveHelpGuide } from '../../../../constants/helpGuides.constant';

const HelpPartial = () => {
    const { pathname } = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const guia = resolveHelpGuide(pathname);
    if (!guia) return null;

    return (
        <>
            <Button icon='HeroQuestionMarkCircle' aria-label='Ayuda' onClick={() => setIsOpen(true)} />
            <HelpDrawer
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                guiaPath={guia.guiaPath}
                titulo={guia.titulo}
            />
        </>
    );
};

export default HelpPartial;
