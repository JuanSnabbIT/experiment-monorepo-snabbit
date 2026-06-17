import { useUpdateContratoTrabajadorMutation } from '@/store/slices/rrhh/contratoTrabajadorApi';
import { getErrorMessageWithSuggestion } from '@/utils/getErrorMessageWithSuggestion';
import { useCallback, useEffect, useRef, useState } from 'react';

interface IContratoWizardState {
  contrato: Record<string, any> | null;
  cambios: Record<string, any>;
  guardando: boolean;
  error: string | null;
  éxito: boolean;
  ultimoGuardado: Date | null;
}

export interface IUseContratoWizardReturn {
  contrato: Record<string, any> | null;
  cambios: Record<string, any>;
  guardando: boolean;
  error: string | null;
  éxito: boolean;
  ultimoGuardado: Date | null;
  actualizarCampo: (campo: string, valor: any) => void;
  guardarAhora: () => Promise<void>;
  descartar: () => void;
  reintentarGuardar: () => Promise<void>;
}

const STORAGE_KEY = (contratoId: number) => `contrato_cambios_${contratoId}`;
const MAX_RETRIES = 2;
const DEBOUNCE_DELAY = 2000; // 2 segundos

export const useContratoWizard = (
  contratoId: number | null,
  contratoInicial?: Record<string, any> | null
): IUseContratoWizardReturn => {
  const [state, setState] = useState<IContratoWizardState>({
    contrato: contratoInicial || null,
    cambios: {},
    guardando: false,
    error: null,
    éxito: false,
    ultimoGuardado: null,
  });

  const [updateContrato] = useUpdateContratoTrabajadorMutation();
  const retryCountRef = useRef(0);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Recuperar cambios del localStorage si existen
  useEffect(() => {
    if (!contratoId) return;

    const cambiosGuardados = localStorage.getItem(STORAGE_KEY(contratoId));
    if (cambiosGuardados) {
      try {
        const parsed = JSON.parse(cambiosGuardados);
        setState((prev) => ({
          ...prev,
          cambios: parsed,
        }));
      } catch (e) {
        console.error('Error recuperando cambios del localStorage:', e);
      }
    }
  }, [contratoId]);

  // Función para guardar en backend
  const guardarEnBackend = useCallback(
    async (cambiosAGuardar: Record<string, any>) => {
      if (!contratoId || Object.keys(cambiosAGuardar).length === 0) {
        return;
      }

      setState((prev) => ({
        ...prev,
        guardando: true,
        error: null,
      }));

      try {
        await updateContrato({
          id: contratoId,
          data: cambiosAGuardar,
        }).unwrap();

        setState((prev) => ({
          ...prev,
          cambios: {},
          guardando: false,
          éxito: true,
          ultimoGuardado: new Date(),
          error: null,
        }));

        // Limpiar localStorage
        localStorage.removeItem(STORAGE_KEY(contratoId));

        // Limpiar estado de éxito después de 3 segundos
        setTimeout(() => {
          setState((prev) => ({ ...prev, éxito: false }));
        }, 3000);

        retryCountRef.current = 0;
      } catch (err: any) {
        const errorWithSuggestion = getErrorMessageWithSuggestion(err);
        const errorMsg = errorWithSuggestion.suggestion
          ? `${errorWithSuggestion.message}. ${errorWithSuggestion.suggestion}`
          : errorWithSuggestion.message;

        // Si hay retries disponibles, reintentar automáticamente
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          console.warn(
            `Error guardando cambios. Reintentando (${retryCountRef.current}/${MAX_RETRIES})...`
          );

          // Esperar un poco antes de reintentar
          await new Promise((resolve) => {
            setTimeout(resolve, 1000 * retryCountRef.current);
          });

          // Llamada recursiva para reintentar
          await guardarEnBackend(cambiosAGuardar);
          return;
        }

        setState((prev) => ({
          ...prev,
          guardando: false,
          error: errorMsg,
          éxito: false,
        }));

        // Guardar en localStorage como fallback
        localStorage.setItem(
          STORAGE_KEY(contratoId),
          JSON.stringify(cambiosAGuardar)
        );

        retryCountRef.current = 0;
      }
    },
    [contratoId, updateContrato]
  );

  // Actualizar campo con debounce nativo
  const nuevosCambiosRef = useRef<Record<string, any>>({});

  const actualizarCampo = useCallback(
    (campo: string, valor: any) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      setState((prev) => {
        const nuevosCambios = {
          ...prev.cambios,
          [campo]: valor,
        };

        if (contratoId) {
          localStorage.setItem(
            STORAGE_KEY(contratoId),
            JSON.stringify(nuevosCambios)
          );
        }

        nuevosCambiosRef.current = nuevosCambios;

        return {
          ...prev,
          cambios: nuevosCambios,
          error: null,
          guardando: true,
        };
      });

      debounceTimeoutRef.current = setTimeout(() => {
        guardarEnBackend(nuevosCambiosRef.current);
      }, DEBOUNCE_DELAY);
    },
    [contratoId, guardarEnBackend]
  );

  // Guardar ahora (sin debounce)
  const guardarAhora = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    await guardarEnBackend(state.cambios);
  }, [state.cambios, guardarEnBackend]);

  // Descartar cambios
  const descartar = useCallback(() => {
    if (contratoId) {
      localStorage.removeItem(STORAGE_KEY(contratoId));
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setState((prev) => ({
      ...prev,
      cambios: {},
      error: null,
      éxito: false,
    }));
    retryCountRef.current = 0;
  }, [contratoId]);

  // Reintentar guardar
  const reintentarGuardar = useCallback(async () => {
    retryCountRef.current = 0;
    await guardarEnBackend(state.cambios);
  }, [state.cambios, guardarEnBackend]);

  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    contrato: state.contrato,
    cambios: state.cambios,
    guardando: state.guardando,
    error: state.error,
    éxito: state.éxito,
    ultimoGuardado: state.ultimoGuardado,
    actualizarCampo,
    guardarAhora,
    descartar,
    reintentarGuardar,
  };
};
