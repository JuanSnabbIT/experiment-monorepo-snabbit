import { useEffect, useState } from 'react';
import { listarSimpleHistorialThunk, useAppDispatch, useAppSelector } from '@/store';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import Timeline, { TimelineItem } from '@/components/Timeline';
import { IHistorialSimple } from '@/interface/ordenTrabajo.interface';
import { TColors } from '@/types/colors.type';
import Icon from '@/components/icon/Icon';
import Collapse from '@/components/utils/Collapse';


const HistorialOT = ({ordenId} : {ordenId: number | undefined}) => {
    const dispatch = useAppDispatch();
    const { listarSimpleHistorial } = useAppSelector((state) => state.ordenTrabajo);
    const [openItemIndex, setOpenItemIndex] = useState<number | null>(null);
    const [isOpening, setIsOpening] = useState<boolean>(false);

    useEffect(() => {
        dispatch(listarSimpleHistorialThunk({id: ordenId}));
    }, [dispatch, ordenId]);

    const handleToggle = (index: number) => {
        if (isOpening) return;
        setIsOpening(true);
        if (openItemIndex === index) {
            setOpenItemIndex(null);
        } else {
            setOpenItemIndex(index);
        }
        setTimeout(() => setIsOpening(false), 1000);
    };

    const getIcon = (accion: string): string => {
        if (accion.includes('Creado')) return 'HeroPlus';
        if (accion.includes('Eliminado')) return 'HeroTrash';
        if (accion.includes('Modificado')) return 'HeroPencil';
        return 'HeroInfo';
    };

    const getColor = (accion: string): TColors => {
        if (accion.includes('Creado')) return 'emerald';
        if (accion.includes('Eliminado')) return 'red';
        if (accion.includes('Modificado')) return 'violet';
        return 'blue';
    };

    const getBadgeText = (accion: string): string => {
        if (accion === '+') return 'Creado';
        if (accion === '-') return 'Eliminado';
        if (accion === '~') return 'Modificado';
        return accion;
    };
    
    return (
        <Card className="w-full">
            <CardHeader>
                <Badge className="text-xl">Historial de Cambios</Badge>
            </CardHeader>
            <CardBody className="w-full h-full">
                {listarSimpleHistorial.length > 0 ? (
                    <Timeline className='h-full max-h-[40vh] overflow-auto'>
                        {listarSimpleHistorial.map((item, index) => (
                            <div className="flex flex-col justify-between w-full mb-4" key={index}>
                                <TimelineItem
                                    icon={getIcon(item.accion_tipo)}
                                    color={getColor(item.accion_tipo)}
                                    colorShade="500"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            <Badge className={`mr-2 text-${getColor(item.accion_tipo)}-500`}>
                                                {item.accion_tipo}
                                            </Badge>
                                            <Icon
                                                icon="HeroEye"
                                                className="w-5 h-5 text-gray-400 cursor-pointer"
                                                onClick={() => handleToggle(index)}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-sm">
                                        {item.history_user &&
                                            `El usuario ${item.history_user} ha ${
                                                item.accion_tipo
                                                    ? `${item.accion_tipo} un elemento en `
                                                    : ''
                                            }${item.accion_modelo}`}
                                    </div>
                                </TimelineItem>
                                <Collapse isOpen={openItemIndex === index} className="transition-opacity">
                                    <div className='pl-8'>
                                        <Timeline>
                                            {item.detalle_cambio?.split('\n\n').map((detalle, i) => (
                                                <TimelineItem icon="HeroHashtag" color="blue" colorShade="500" key={i}>
                                                    <div className="p-3 rounded-md shadow-sm">
                                                        <Badge className="mb-1">{detalle}</Badge>
                                                        <div className="ml-4">
                                                            {item.valor_anterior && (
                                                                <p className="text-sm text-red-500">
                                                                    Valor anterior: {item.valor_anterior}
                                                                </p>
                                                            )}
                                                            {item.valor_nuevo && (
                                                                <p className="text-sm text-green-500">
                                                                    Valor nuevo: {item.valor_nuevo}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TimelineItem>
                                            ))}
                                            {listarSimpleHistorial
                                                .filter(
                                                    (hist) =>
                                                        hist.history_date === item.history_date &&
                                                        hist.history_user === item.history_user &&
                                                        hist !== item
                                                )
                                                .map((hist, i) => (
                                                    <TimelineItem icon="HeroHashtag" color="blue" colorShade="500" key={i}>
                                                        <div className="p-3 rounded-md shadow-sm">
                                                            <Badge className="mb-1">{hist.detalle_cambio}</Badge>
                                                            <div className="ml-4">
                                                                {hist.valor_anterior && (
                                                                    <p className="text-sm text-red-500">
                                                                        Valor anterior: {hist.valor_anterior}
                                                                    </p>
                                                                )}
                                                                {hist.valor_nuevo && (
                                                                    <p className="text-sm text-green-500">
                                                                        Valor nuevo: {hist.valor_nuevo}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TimelineItem>
                                                ))}
                                        </Timeline>
                                    </div>
                                </Collapse>
                                <div className="text-sm text-gray-500 text-right w-full">
                                    {item.history_date 
                                        ? new Date(item.history_date).toLocaleString()
                                        : 'Fecha no disponible'}
                                </div>
                            </div>
                        ))}
                    </Timeline>
                ) : (
                    <div>Sin historial</div>
                )}
                {/* {loading ? (
                    <div>Cargando historial...</div>
                ) : listarSimpleHistorial.length === 0 ? (
                    <div>No hay cambios registrados.</div>
                ) : (
                    <Timeline className="h-full max-h-[30vh] overflow-y-auto">
                        {listarSimpleHistorial
                            .filter(
                                (item, index, self) =>
                                    index ===
                                    self.findIndex(
                                        (t) =>
                                            t.history_user === item.history_user &&
                                            t.history_date === item.history_date
                                    )
                            )
                            .map((item: IHistorialSimple, index: number) => {
                                const accionFinal = getBadgeText(
                                    Array.isArray(item.accion) ? item.accion.join(', ') : item.accion
                                );
                                return (
                                    <div className="flex flex-col justify-between w-full mb-4" key={index}>
                                        <TimelineItem
                                            icon={getIcon(accionFinal)}
                                            color={getColor(accionFinal)}
                                            colorShade="500"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center">
                                                    <Badge className={`mr-2 text-${getColor(accionFinal)}-500`}>
                                                        {accionFinal}
                                                    </Badge>
                                                    <Icon
                                                        icon="HeroEye"
                                                        className="w-5 h-5 text-gray-400 cursor-pointer"
                                                        onClick={() => handleToggle(index)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-sm">
                                                {item.history_user &&
                                                    `El usuario ${item.history_user} ha ${
                                                        item.accion_tipo
                                                            ? `${item.accion_tipo} un elemento en `
                                                            : ''
                                                    }${item.accion_modelo}`}
                                            </div>
                                        </TimelineItem>
                                        <Collapse isOpen={openItemIndex === index} className="transition-opacity">
                                            <div className='pl-8'>
                                                <Timeline>
                                                    {item.detalle_cambio?.split('\n\n').map((detalle, i) => (
                                                        <TimelineItem icon="HeroHashtag" color="blue" colorShade="500" key={i}>
                                                            <div className="p-3 rounded-md shadow-sm">
                                                                <Badge className="mb-1">{detalle}</Badge>
                                                                <div className="ml-4">
                                                                    {item.valor_anterior && (
                                                                        <p className="text-sm text-red-500">
                                                                            Valor anterior: {item.valor_anterior}
                                                                        </p>
                                                                    )}
                                                                    {item.valor_nuevo && (
                                                                        <p className="text-sm text-green-500">
                                                                            Valor nuevo: {item.valor_nuevo}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TimelineItem>
                                                    ))}
                                                    {listarSimpleHistorial
                                                        .filter(
                                                            (hist) =>
                                                                hist.history_date === item.history_date &&
                                                                hist.history_user === item.history_user &&
                                                                hist !== item
                                                        )
                                                        .map((hist, i) => (
                                                            <TimelineItem icon="HeroHashtag" color="blue" colorShade="500" key={i}>
                                                                <div className="p-3 rounded-md shadow-sm">
                                                                    <Badge className="mb-1">{hist.detalle_cambio}</Badge>
                                                                    <div className="ml-4">
                                                                        {hist.valor_anterior && (
                                                                            <p className="text-sm text-red-500">
                                                                                Valor anterior: {hist.valor_anterior}
                                                                            </p>
                                                                        )}
                                                                        {hist.valor_nuevo && (
                                                                            <p className="text-sm text-green-500">
                                                                                Valor nuevo: {hist.valor_nuevo}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </TimelineItem>
                                                        ))}
                                                </Timeline>
                                            </div>
                                        </Collapse>
                                        <div className="text-sm text-gray-500 text-right w-full">
                                            {item.history_date 
                                                ? new Date(item.history_date).toLocaleString()
                                                : 'Fecha no disponible'}
                                        </div>
                                    </div>
                                );
                            })}
                    </Timeline>
                )} */}
            </CardBody>
        </Card>
    );
};

export default HistorialOT;
