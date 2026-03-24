import Input from '@/components/form/Input';
import Button from '@/components/ui/Button';
import Dropdown, { DropdownItem, DropdownMenu, DropdownToggle } from '@/components/ui/Dropdown';
import { CATEGORIAS_ETIQUETA } from '@/constants/contrato.constant';
import { IEtiquetaPlantilla } from '@/interface/plantillaContrato.interface';
import { useMemo, useState } from 'react';

interface ISelectorEtiquetaProps {
    etiquetas: IEtiquetaPlantilla[];
    onSelect: (clave: string) => void;
}

const SelectorEtiqueta = ({ etiquetas, onSelect }: ISelectorEtiquetaProps) => {
    const [busqueda, setBusqueda] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const etiquetasFiltradas = useMemo(() => {
        if (!busqueda) return etiquetas;
        const q = busqueda.toLowerCase();
        return etiquetas.filter(
            (e) =>
                e.nombre_display.toLowerCase().includes(q) ||
                e.clave.toLowerCase().includes(q),
        );
    }, [etiquetas, busqueda]);

    const agrupadas = useMemo(() => {
        const grupos: Record<string, IEtiquetaPlantilla[]> = {};
        etiquetasFiltradas.forEach((e) => {
            if (!grupos[e.categoria]) grupos[e.categoria] = [];
            grupos[e.categoria].push(e);
        });
        return grupos;
    }, [etiquetasFiltradas]);

    const getCategoriaLabel = (cat: string) =>
        CATEGORIAS_ETIQUETA.find((c) => c.value === cat)?.label || cat;

    return (
        <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
            <DropdownToggle>
                <Button icon='HeroTag' size='sm'>
                    Insertar Etiqueta
                </Button>
            </DropdownToggle>
            <DropdownMenu className='max-h-80 w-72 overflow-auto'>
                <div className='p-2'>
                    <Input
                        name='busqueda-etiqueta'
                        placeholder='Buscar etiqueta...'
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                {Object.entries(agrupadas).map(([cat, items]) => (
                    <div key={cat}>
                        <div className='px-3 py-1 text-xs font-semibold uppercase text-zinc-500'>
                            {getCategoriaLabel(cat)}
                        </div>
                        {items.map((e) => (
                            <DropdownItem
                                key={e.id}
                                onClick={() => {
                                    onSelect(e.clave);
                                    setIsOpen(false);
                                    setBusqueda('');
                                }}>
                                <div className='flex flex-col'>
                                    <span className='font-medium'>{e.nombre_display}</span>
                                    <span className='text-xs text-zinc-400'>[{e.clave}]</span>
                                </div>
                            </DropdownItem>
                        ))}
                    </div>
                ))}
                {etiquetasFiltradas.length === 0 && (
                    <div className='p-3 text-center text-sm text-zinc-400'>
                        No se encontraron etiquetas
                    </div>
                )}
            </DropdownMenu>
        </Dropdown>
    );
};

export default SelectorEtiqueta;
