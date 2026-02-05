import * as PopperJS from '@popperjs/core';
import classNames from 'classnames';
import {
    cloneElement,
    FC,
    HTMLAttributes,
    ReactElement,
    ReactNode,
    useCallback,
    useRef,
    useState,
} from 'react';
import { Manager, Popper, Reference } from 'react-popper';
import themeConfig from '../../config/theme.config';
import { TRounded } from '../../types/rounded.type';
import Icon from '../icon/Icon';
import Portal from '../layouts/Portal/Portal';

const getComponentName = (child: ReactNode): string => {
    /* eslint-disable */
    // @ts-ignore
    return child?.props['data-component-name'] || child?.type?.displayName || child?.type;
    /* eslint-enable */
};

interface ITooltipProps extends HTMLAttributes<HTMLDivElement> {
    children?: ReactNode;
    className?: string;
    text: string;
    placement?: PopperJS.Placement;
    rounded?: TRounded;
}
const Tooltip: FC<ITooltipProps> = (props) => {
    const {
        children,
        className,
        text,
        placement = 'top',
        rounded = themeConfig.rounded,
        ...rest
    } = props;

    const [isOpen, setIsOpen] = useState<boolean>(false);

    const referenceRef = useRef<HTMLElement | null>(null);
    const setReferenceRef = useCallback(
        (node: HTMLElement, ref: (node: HTMLElement) => HTMLElement) => {
            referenceRef.current = node;
            return ref(node);
        },
        [],
    );

    const popperRef = useRef<HTMLElement | null>(null);
    const setPopperRef = useCallback(
        (node: HTMLElement, ref: (node: HTMLElement) => HTMLElement) => {
            popperRef.current = node;
            return ref(node);
        },
        [],
    );

    const REFERENCE_PROPS = {
        onMouseEnter: () => setIsOpen(true),
        onMouseLeave: () => setIsOpen(false),
    };

    return (
        <Manager>
            <Reference>
                {({ ref }) =>
                    ['string', 'undefined'].includes(typeof children) ? (
                        <span
                            data-component-name='Tooltip/Reference'
                            // @ts-ignore
                            ref={(node) => setReferenceRef(node, ref)}
                            className='cursor-pointer'
                            {...REFERENCE_PROPS}>
                            {children || (
                                <Icon
                                    icon='HeroInformationCircle'
                                    className={classNames('inline-flex', className)}
                                />
                            )}
                        </span>
                    ) : (
                        cloneElement(children as ReactElement, {
                            'data-component-name': `${getComponentName(
                                children,
                            )} is cloned with Tooltip`,
                            // @ts-ignore
                            ref: (node: HTMLElement) => setReferenceRef(node, ref),
                            // @ts-ignore
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                            className: classNames('cursor-pointer', children.props.className),
                            ...REFERENCE_PROPS,
                        })
                    )
                }
            </Reference>
            {isOpen && text !== '' && (
                <Portal>
                    <Popper placement={placement}>
                        {({ ref, style }) => (
                            <div
                                data-component-name='Tooltip/Popper'
                                // @ts-ignore
                                ref={(node) => setPopperRef(node, ref)}
                                style={{
                                    ...style,
                                    zIndex: 99999,
                                }}
                                className={classNames(
                                    'm-2 px-3 py-2',
                                    'max-w-xs',
                                    'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
                                    'border border-zinc-700 dark:border-zinc-300',
                                    'shadow-xl',
                                    'text-sm font-medium',
                                    [`${rounded}`],
                                    className,
                                )}
                                {...rest}>
                                {text}
                            </div>
                        )}
                    </Popper>
                </Portal>
            )}
        </Manager>
    );
};
Tooltip.displayName = 'Tooltip';

export default Tooltip;
