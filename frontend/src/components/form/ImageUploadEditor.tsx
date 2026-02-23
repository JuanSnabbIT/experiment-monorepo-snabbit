import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useCallback, useEffect, useRef, useState } from 'react';

interface IImageUploadEditorProps {
	/** Etiqueta descriptiva del campo */
	label: string;
	/** Imagen actual en base64 (data:image/...) o vacía */
	currentImage?: string | null;
	/** Ancho máximo por defecto para el resize (en px) */
	defaultMaxWidth?: number;
	/** Alto máximo por defecto para el resize (en px) */
	defaultMaxHeight?: number;
	/** Callback cuando la imagen cambia (base64 string) */
	onImageChange: (base64: string) => void;
	/** Callback para eliminar la imagen */
	onImageDelete?: () => void;
	/** Calidad JPEG de salida (0-1). Usa PNG si no se especifica */
	outputQuality?: number;
	/** Formato de salida: 'image/png' | 'image/jpeg' */
	outputFormat?: 'image/png' | 'image/jpeg';
}

/**
 * Componente reutilizable que permite subir una imagen, previsualizarla
 * y ajustar sus dimensiones (ancho/alto) con redimensionamiento real
 * del canvas antes de exportar a base64.
 *
 * Mantiene la relación de aspecto al modificar una dimensión.
 */
function ImageUploadEditor({
	label,
	currentImage,
	defaultMaxWidth = 400,
	defaultMaxHeight = 200,
	onImageChange,
	onImageDelete,
	outputQuality = 0.92,
	outputFormat = 'image/png',
}: IImageUploadEditorProps) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const dropZoneRef = useRef<HTMLDivElement | null>(null);

	// Imagen cargada (original sin redimensionar)
	const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
	const [originalDataUrl, setOriginalDataUrl] = useState<string>('');

	// Dimensiones de salida
	const [outputWidth, setOutputWidth] = useState<number>(defaultMaxWidth);
	const [outputHeight, setOutputHeight] = useState<number>(defaultMaxHeight);
	const [aspectRatio, setAspectRatio] = useState<number>(1);
	const [lockAspect, setLockAspect] = useState<boolean>(true);

	// Preview redimensionado
	const [previewUrl, setPreviewUrl] = useState<string>('');

	// Drag state
	const [isDragging, setIsDragging] = useState(false);

	// Cuando se carga una nueva imagen original, calcular dimensiones iniciales
	const processImage = useCallback(
		(dataUrl: string) => {
			const img = new Image();
			img.onload = () => {
				setOriginalImage(img);
				setOriginalDataUrl(dataUrl);
				setAspectRatio(img.width / img.height);

				// Calcular dimensiones iniciales respetando los máximos
				let w = img.width;
				let h = img.height;

				if (w > defaultMaxWidth) {
					w = defaultMaxWidth;
					h = Math.round(w / (img.width / img.height));
				}
				if (h > defaultMaxHeight) {
					h = defaultMaxHeight;
					w = Math.round(h * (img.width / img.height));
				}

				setOutputWidth(w);
				setOutputHeight(h);
			};
			img.src = dataUrl;
		},
		[defaultMaxWidth, defaultMaxHeight],
	);

	// Redimensionar usando canvas y generar base64 final
	const resizeAndExport = useCallback(() => {
		if (!originalImage) return;

		const canvas = document.createElement('canvas');
		canvas.width = outputWidth;
		canvas.height = outputHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(originalImage, 0, 0, outputWidth, outputHeight);

		const resizedBase64 = canvas.toDataURL(outputFormat, outputQuality);
		setPreviewUrl(resizedBase64);
		onImageChange(resizedBase64);
	}, [originalImage, outputWidth, outputHeight, outputFormat, outputQuality, onImageChange]);

	// Re-exportar cada vez que cambian las dimensiones
	useEffect(() => {
		if (originalImage) {
			resizeAndExport();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [outputWidth, outputHeight, originalImage]);

	// Leer archivo seleccionado
	const handleFileSelected = (file: File) => {
		if (!file || !file.type.startsWith('image/')) return;

		const reader = new FileReader();
		reader.onloadend = () => {
			const result = reader.result as string;
			processImage(result);
		};
		reader.readAsDataURL(file);
	};

	// Click en el file input
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files[0]) {
			handleFileSelected(files[0]);
		}
	};

	// Drag & Drop handlers
	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		const files = e.dataTransfer.files;
		if (files && files[0]) {
			handleFileSelected(files[0]);
		}
	};

	// Handlers de dimensiones
	const handleWidthChange = (newWidth: number) => {
		const w = Math.max(10, Math.min(newWidth, 2000));
		setOutputWidth(w);
		if (lockAspect) {
			setOutputHeight(Math.round(w / aspectRatio));
		}
	};

	const handleHeightChange = (newHeight: number) => {
		const h = Math.max(10, Math.min(newHeight, 2000));
		setOutputHeight(h);
		if (lockAspect) {
			setOutputWidth(Math.round(h * aspectRatio));
		}
	};

	const handleScaleChange = (scale: number) => {
		if (!originalImage) return;
		const baseW = Math.min(originalImage.width, defaultMaxWidth);
		const baseH = baseW / aspectRatio;
		const newW = Math.round(baseW * scale);
		const newH = Math.round(baseH * scale);
		setOutputWidth(newW);
		setOutputHeight(newH);
	};

	// Calcular escala actual para el slider
	const currentScale = originalImage
		? outputWidth / Math.min(originalImage.width, defaultMaxWidth)
		: 1;

	const handleClear = () => {
		setOriginalImage(null);
		setOriginalDataUrl('');
		setPreviewUrl('');
		setOutputWidth(defaultMaxWidth);
		setOutputHeight(defaultMaxHeight);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const hasImage = !!originalImage || !!previewUrl;

	return (
		<div className='flex flex-col gap-3'>
			<Badge>{label}</Badge>

			{/* Zona de subida / preview */}
			{!hasImage ? (
				<div
					ref={dropZoneRef}
					className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
						isDragging
							? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
							: 'border-zinc-300 hover:border-blue-400 dark:border-zinc-600'
					}`}
					onClick={() => fileInputRef.current?.click()}
					onDragEnter={handleDragEnter}
					onDragLeave={handleDragLeave}
					onDragOver={handleDragOver}
					onDrop={handleDrop}>
					<svg
						className='mb-2 h-10 w-10 text-zinc-400'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={1.5}
							d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
						/>
					</svg>
					<p className='text-sm text-zinc-500 dark:text-zinc-400'>
						Arrastra una imagen aquí o{' '}
						<span className='font-semibold text-blue-500'>haz clic para subir</span>
					</p>
					<p className='mt-1 text-xs text-zinc-400'>PNG, JPG, WEBP</p>
				</div>
			) : (
				<div className='flex flex-col gap-3'>
					{/* Preview de la imagen */}
					<div className='flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50'>
						<img
							src={previewUrl || originalDataUrl}
							alt={label}
							style={{
								maxWidth: '100%',
								maxHeight: '300px',
								width: `${outputWidth}px`,
								height: 'auto',
								objectFit: 'contain',
							}}
						/>
					</div>

					{/* Controles de tamaño */}
					<div className='rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50'>
						<p className='mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500'>
							Ajustes de tamaño
						</p>

						{/* Slider de escala */}
						<div className='mb-3 flex items-center gap-3'>
							<span className='w-16 text-xs text-zinc-500'>Escala</span>
							<input
								type='range'
								min='0.1'
								max='2'
								step='0.05'
								value={currentScale}
								onChange={(e) =>
									handleScaleChange(parseFloat(e.target.value))
								}
								className='h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-blue-500 dark:bg-zinc-600'
							/>
							<span className='w-14 text-right text-xs text-zinc-500'>
								{Math.round(currentScale * 100)}%
							</span>
						</div>

						{/* Inputs de ancho y alto */}
						<div className='flex flex-wrap items-center gap-3'>
							<div className='flex items-center gap-1.5'>
								<span className='text-xs text-zinc-500'>Ancho:</span>
								<input
									type='number'
									value={outputWidth}
									onChange={(e) =>
										handleWidthChange(parseInt(e.target.value) || 10)
									}
									className='w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700'
									min={10}
									max={2000}
								/>
								<span className='text-xs text-zinc-400'>px</span>
							</div>

							<Tooltip
								text={
									lockAspect
										? 'Aspecto bloqueado'
										: 'Aspecto libre'
								}>
								<button
									type='button'
									onClick={() => setLockAspect(!lockAspect)}
									className={`rounded p-1 transition-colors ${
										lockAspect
											? 'text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20'
											: 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
									}`}>
									<svg
										className='h-4 w-4'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'>
										{lockAspect ? (
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
											/>
										) : (
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z'
											/>
										)}
									</svg>
								</button>
							</Tooltip>

							<div className='flex items-center gap-1.5'>
								<span className='text-xs text-zinc-500'>Alto:</span>
								<input
									type='number'
									value={outputHeight}
									onChange={(e) =>
										handleHeightChange(parseInt(e.target.value) || 10)
									}
									className='w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700'
									min={10}
									max={2000}
								/>
								<span className='text-xs text-zinc-400'>px</span>
							</div>
						</div>
					</div>

					{/* Acciones */}
					<div className='flex items-center gap-2'>
						<Button
							variant='outline'
							size='sm'
							icon='HeroArrowPath'
							onClick={() => fileInputRef.current?.click()}>
							Cambiar imagen
						</Button>
						<Button
							variant='outline'
							size='sm'
							color='red'
							icon='HeroTrash'
							onClick={handleClear}>
							Quitar
						</Button>
						{onImageDelete && (
							<Tooltip text={`Eliminar ${label.toLowerCase()} del servidor`}>
								<Button
									variant='solid'
									size='sm'
									color='red'
									icon='HeroTrash'
									onClick={onImageDelete}>
									Eliminar guardada
								</Button>
							</Tooltip>
						)}
					</div>
				</div>
			)}

			{/* Input oculto */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/*'
				className='hidden'
				onChange={handleInputChange}
			/>

			{/* Vista previa de la imagen guardada (si no hay imagen nueva cargada y existe currentImage) */}
			{!hasImage && currentImage && (
				<div className='mt-2'>
					<p className='mb-1 text-xs text-zinc-500'>Imagen actual guardada:</p>
					<div className='flex items-start gap-3'>
						<img
							src={currentImage}
							alt={label}
							className='max-h-32 rounded border border-zinc-200 dark:border-zinc-600'
						/>
						{onImageDelete && (
							<Tooltip text={`Eliminar ${label.toLowerCase()}`}>
								<Button
									variant='solid'
									size='sm'
									color='red'
									icon='HeroTrash'
									onClick={onImageDelete}
								/>
							</Tooltip>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default ImageUploadEditor;
