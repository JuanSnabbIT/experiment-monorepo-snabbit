import Button, { IButtonProps } from '@/components/ui/Button';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';
import Card, { CardBody } from '@/components/ui/Card';
import Dropdown, { DropdownToggle, DropdownMenu, DropdownItem } from '@/components/ui/Dropdown';
import COMPONENT_TYPES, { TComponentType } from './constants';

interface IComponentButtonsPartialProps {
    activeComponent: TComponentType;
    setActiveComponent: Dispatch<SetStateAction<TComponentType>>;
}

const ComponentButtonsPartialVisita: FC<IComponentButtonsPartialProps> = ({ activeComponent, setActiveComponent }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 768;
            setIsMobile(mobile);
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const defaultProps: IButtonProps = {
        size: 'sm',
        color: 'zinc',
        rounded: 'rounded-full',
        className: 'border'
    };
    const activeProps: IButtonProps = {
        ...defaultProps,
        isActive: true,
        color: 'blue',
        colorIntensity: '500',
        variant: 'solid',
    };

    return (
        <Card>
            <CardBody className="flex flex-row justify-between gap-4">
                {isMobile ? (
                    <div className="flex flex-row justify-end w-full">
                        <Dropdown>
                            <DropdownToggle hasIcon={false}>
                                <Button icon='HeroServer' aria-label='Seleccionar Sección'>
                                    {activeComponent.text}
                                </Button>
                            </DropdownToggle>
                            <DropdownMenu placement='bottom-start' className="block z-50">
                                {Object.values(COMPONENT_TYPES).map((i) => (
                                    <DropdownItem
                                        key={i.text}
                                        isActive={activeComponent.text === i.text}
                                        onClick={() => setActiveComponent(i)}>
                                        {i.text}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                ) : (
                    <div className="flex flex-row gap-4">
                        {Object.values(COMPONENT_TYPES).map((i) => (
                            <Button
                            key={i.text}
                            {...(activeComponent.text === i.text ? { ...activeProps } : { ...defaultProps })}
                            onClick={() => {
                                setActiveComponent(i);
                                }}>
                                {i.text}
                            </Button>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default ComponentButtonsPartialVisita;
