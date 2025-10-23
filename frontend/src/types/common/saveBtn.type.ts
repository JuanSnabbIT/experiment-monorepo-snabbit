export type TSaveBtnStatusValue = 'Publicar' | 'Guardar' | 'Guardando' | 'Guardado';
export type TSaveBtnStatus = {
	[key in 'PUBLISH' | 'SAVE' | 'SAVING' | 'SAVED']: TSaveBtnStatusValue;
};
