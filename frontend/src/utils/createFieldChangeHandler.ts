import { FormikProps } from 'formik';
import type { IUseContratoWizardReturn } from '@/hooks/useContratoWizard';
import { IFormValuesContratoTrabajador } from '@/pages/RRHH/components/trabajador/types';

export const createFieldChangeHandler = (
  fieldName: keyof IFormValuesContratoTrabajador,
  formik: FormikProps<IFormValuesContratoTrabajador>,
  wizard?: IUseContratoWizardReturn
) => {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { value } = e.target;
    
    // Si wizard está disponible y tiene un método actualizarCampo, usarlo
    if (wizard && typeof wizard.actualizarCampo === 'function') {
      wizard.actualizarCampo(fieldName, value);
    }
    
    // Siempre mantener formik sincronizado
    formik.setFieldValue(fieldName, value, true);
  };
};

export const createSelectChangeHandler = (
  fieldName: keyof IFormValuesContratoTrabajador,
  formik: FormikProps<IFormValuesContratoTrabajador>,
  wizard?: IUseContratoWizardReturn
) => {
  return (value: any) => {
    // Si wizard está disponible, usarlo
    if (wizard && typeof wizard.actualizarCampo === 'function') {
      wizard.actualizarCampo(fieldName, value);
    }
    
    // Siempre mantener formik sincronizado
    formik.setFieldValue(fieldName, value, true);
  };
};
