import { IDiaCalendario } from '@/interface/calendario.interface';
import { eachDayOfInterval, isWeekend, format, parseISO } from 'date-fns';

/**
 * Calcula la cantidad de días hábiles entre dos fechas (inclusive),
 * excluyendo fines de semana y los días que estén en la lista de días de calendario.
 *
 * @param fechaInicio - fecha de inicio (Date)
 * @param fechaFin    - fecha de fin (Date)
 * @param diasCalendario - lista de objetos con fechas a excluir
 * @returns número de días hábiles
 */
const calcularDiasHabilesConCalendario = (
    fechaInicio: Date,
    fechaFin: Date,
    diasCalendario: IDiaCalendario[],
): number => {
    // 1) Genera el array de todos los días en el intervalo
    const allDays = eachDayOfInterval({ start: fechaInicio, end: fechaFin });

    // 2) Crea un Set de strings "YYYY-MM-DD" de los días a excluir (solo feriados)
    const feriadosSet = new Set(
        diasCalendario
            .filter((d) => d.es_feriado) // solo aquellos marcados como feriado
            .map((d) => format(parseISO(d.fecha), 'yyyy-MM-dd')),
    );

    // 3) Filtra: no fin de semana, y que la fecha no esté en feriadosSet
    const businessDays = allDays.filter((day) => {
        const diaStr = format(day, 'yyyy-MM-dd');
        if (isWeekend(day)) return false; // excluye sábados y domingos
        if (feriadosSet.has(diaStr)) return false; // excluye feriados
        return true;
    });

    return businessDays.length;
};

export default calcularDiasHabilesConCalendario;
