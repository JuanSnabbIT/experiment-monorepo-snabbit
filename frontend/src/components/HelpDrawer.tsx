import { Dispatch, FC, SetStateAction } from 'react';
import ReactMarkdown from 'react-markdown';
import Modal, { ModalBody, ModalHeader } from '@/components/ui/Modal';
import useMdToString from '@/hooks/useMdToString';

interface IHelpDrawerProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    guiaPath: string;
    titulo: string;
}

const HelpDrawer: FC<IHelpDrawerProps> = ({ isOpen, setIsOpen, guiaPath, titulo }) => {
    const content = useMdToString(guiaPath);

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} size='lg' isCentered isScrollable>
            <ModalHeader>{titulo}</ModalHeader>
            <ModalBody>
                <div className='prose prose-sm mx-auto max-w-3xl break-words dark:prose-invert'>
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </ModalBody>
        </Modal>
    );
};

export default HelpDrawer;
