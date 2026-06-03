import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader } from '@/components/ui/Card';
import React from 'react';

const UltimosEventos = () => {

    return (
        <Card>
            <CardHeader>
                <Badge className='text-xl'>Ultimas Eventos</Badge>
            </CardHeader>
            <CardBody>
                <div>
                    <Badge>Ultimas Eventos</Badge>
                </div>
            </CardBody>
        </Card>
    );
};

export default UltimosEventos;
