import Card, { CardBody } from '@/components/ui/Card';
import Container from '@/components/layouts/Container/Container';
import type { IContratoTrabajador } from '@/interface/rrhh.interface';

interface IProps {
    contrato: IContratoTrabajador;
}

const TabFiniquitoTrabajador = ({ contrato: _ }: IProps) => (
    <Container className='py-4'>
        <Card>
            <CardBody>
                <div className='flex flex-col items-center gap-3 py-10 text-center'>
                    <svg
                        className='h-10 w-10 text-zinc-300 dark:text-zinc-600'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth={1.5}
                        stroke='currentColor'>
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z'
                        />
                    </svg>
                    <p className='text-sm font-medium text-zinc-600 dark:text-zinc-300'>
                        Gestión de finiquitos
                    </p>
                    <p className='max-w-sm text-xs leading-relaxed text-zinc-400 dark:text-zinc-500'>
                        El registro y gestión de finiquitos para este contrato estará disponible
                        próximamente. Esta sección permitirá registrar los conceptos del
                        finiquito, calcular el monto total y gestionar las firmas del trabajador
                        y la empresa.
                    </p>
                </div>
            </CardBody>
        </Card>
    </Container>
);

export default TabFiniquitoTrabajador;
