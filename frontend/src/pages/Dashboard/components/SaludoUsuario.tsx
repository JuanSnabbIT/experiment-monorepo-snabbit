import Card, { CardBody } from '@/components/ui/Card';
import { useAppSelector } from '@/store';

const SaludoUsuario = () => {
    const { userMe } = useAppSelector((state) => state.auth);
    const today = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    return (
        <Card className='mb-4'>
            <CardBody>
                <h1 className='text-2xl font-semibold'>¡Hola, {userMe?.first_name}!</h1>
                <p className='text-sm text-gray-600'>Hoy es {today}</p>
            </CardBody>
        </Card>
    );
};

export default SaludoUsuario;
