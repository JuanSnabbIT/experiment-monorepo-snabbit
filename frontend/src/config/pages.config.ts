
export const authPages = {
	loginPage: {
		id: 'loginPage',
		to: '/login',
		text: 'Login',
		icon: 'HeroArrowRightOnRectangle',
		autority: [],
	},
	profilePage: {
		id: 'profilePage',
		to: '/profile',
		text: 'Perfil',
		icon: 'HeroUser',
		autority: [],
	},
	aceptarInvitacionEmpresa: {
		id: 'aceptarInvitacionEmpresa',
		to: '/aceptar-invitacion/:token',
		text: 'Aceptar Invitacion a Empresa',
		icon: 'HeroUser',
		authority: [],
	},
	RecuperarPassword: {
		id: 'RecuperarPassword',
		to: '/recuperar-contraseña',
		text: 'Recuperar Password',
		icon: 'HeroDocument',
		authority: []
	},
	ConfirmarNuevaPass: {
		id: 'ConfirmarNuevaPass',
		to: '/cambio-contraseña/:uid/:token',
		text: 'Confirmar Nueva Password',
		icon: 'HeroDocument',
		authority: []
	},
	pdfContrato: {
		id: 'pdfContrato',
		to: '/pdf-contrato/:id/:uuid',
		text: 'PDF Contrato',
		icon: 'HeroDocument',
		authority: []
	},
	retroalimentacionOT: {
		id: 'retroalimentacionOT',
		to: '/retroalimentacion-orden-trabajo/:uuid',
		text: 'Retroalimentación OT',
		icon: 'HeroStar',
		authority: []
	},
	firmarContratoYAcuerdo: {
		id: 'firmarContratoYAcuerdo',
		to: '/firmar-contrato/:uuid',
		text: 'Firmar Contrato y Acuerdo de Confidencialidad',
		icon: 'HeroDocument',
		authority: []
	},
};

export const Pages = {
	empresa: {
		id: 'empresa',
		to: '/empresa',
		text: 'Empresa',
		icon: 'HeroBuildingOffice2',
		authority: [],
		subPages: {
			listaUsuariosEmpresa: {
				id: 'listaUsuariosEmpresa',
				to: '/empresa/lista-usuarios-empresa',
				text: 'Usuarios Empresa',
				icon: 'DuoGroup',
				authority: []
			},
			detalleUsuarioEmpresa: {
				id: 'detalleUsuarioEmpresa',
				to: '/empresa/detalle-usuario-empresa/:id',
				text: 'Detalle Usuario Empresa',
				icon: 'DuoGroup',
				authority: []
			},
			// listaClientes:{
			// 	id: 'listaClientes',
			// 	to: '/empresa/lista-clientes',
			// 	text: 'Clientes',
			// 	icon: 'DuoDislike',
			// 	authority: []
			// },
			detalleCliente: {
				id: 'detalleCliente',
				to: '/empresa/detalle-cliente/:id',
				text: 'Clientes',
				icon: 'HeroBuildingOffice2',
				authority: []
			},
			listaEmpresas: {
				id: 'listaEmpresas',
				to: '/empresa/empresas',
				text: 'Empresas',
				icon: 'DuoBuilding',
				authority: [],
			},
			detalleEmpresa: {
				id: 'detalleEmpresa',
				to: '/empresas/:id',
				text: 'Detalle Empresa',
				icon: 'DuoAddressCard',
				authority: [],
			},
			// listaRendicionesSucursal: {
			// 	id: 'listaRendicionesSucursal',
			// 	to: '/empresa/lista-rendiciones-sucursal',
			// 	text: 'Rendiciones Sucursal',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			contratosDelCliente: {
				id: 'contratosDelCliente',
				to: '/empresa/contratos-cliente/:id',
				text: 'Contratos Del Cliente',
				icon: 'HeroDocument',
				authority: []
			},
		}
	},

	cotizacion: {
		id: 'cotizacion',
		to: '/cotizacion',
		text: 'Cotización',
		icon: 'DuoMailbox',
		authority: [],
		subPages: {
			// listaCotizaciones: {
			// 	id: 'listaCotizaciones',
			// 	to: '/cotizacion/lista-cotizaciones',
			// 	text: 'Cotizaciones',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			detalleCotizacion: {
				id: 'detalleCotizacion',
				to: '/cotizacion/detalle-cotizacion/:numero_cotizacion',
				text: 'Detalle Cotización',
				icon: 'HeroDocument',
				authority: []
			},
			listaCotizacionesEmpresa:{
				id: 'listaCotizacionesEmpresa',
				to: '/cotizacion/lista-cotizaciones-empresa',
				text: 'Cotizaciones Clientes',
				icon: 'HeroDocument',
				authority: []
			}
			// listaItemsCotizacion: {
			// 	id: 'listaItemsCotizacion',
			// 	to: '/cotizacion/lista-items-cotizacion',
			// 	text: 'Items Cotizacion',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			// detalleItemCotizacion: {
			// 	id: 'detalleItemCotizacion',
			// 	to: '/cotizacion/detalle-item-cotizacion/:id',
			// 	text: 'Detalle Item Cotizacion',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			// listaSeguimientoCotizacion: {
			// 	id: 'listaSeguimientoCotizacion',
			// 	to: '/cotizacion/lista-seguimiento-cotizacion',
			// 	text: 'Seguimiento Cotizacion',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			// detalleSeguimientoCotizacion: {
			// 	id: 'detalleSeguimientoCotizacion',
			// 	to: '/cotizacion/detalle-seguimiento-cotizacion/:id',
			// 	text: 'Detalle Seguimiento Cotizacion',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
		}
	},

	compras: {
		id: 'compras',
		to: '/compras',
		text: 'Compras',
		icon: 'HeroSquares2X2',
		authority: [],
		subPages: {
			listaOrdenesCompra: {
				id: 'listaOrdenesCompra',
				to: '/compras/lista-ordenes-compra',
				text: 'Ordenes Compra',
				icon: 'HeroDocumentArrowDown',
				authority: []
			},
			listaMisOrdenesDeCompra: {
				id: 'listaMisOrdenesDeCompra',
				to: '/compras/lista-mis-ordenes',
				text: 'Mis Ordenes de Compra',
				icon: "HeroWallet",
				authority: []
			},
			detalleOrdenCompra: {
				id: 'detalleOrdenCompra',
				to: '/compras/detalle-orden-compra/:id',
				text: 'Detalle Orden Compra',
				icon: 'HeroDocument',
				authority: []
			},
			completarOrdenCompra: { 
				id: 'completarOrdenCompra',
				to: '/compras/completar-orden-compra/:id',
				text: 'Completar Orden Compra',
				icon: 'HeroDocument',
				authority: []
			},
			agregarItemsOrdenCompra: {
				id: 'agregarItemsOrdenCompra',
				to: '/compras/agregar-items-oc/:id',
				text: 'Agregar Items a la Orden de Compra',
				icon: 'HeroDocument',
				authority: []
			},
			listaCompra: {
				id: 'listaCompra',
				to: '/compras/lista-compras',
				text: 'Compras',
				icon: 'HeroDocument',
				authority: []
			},
			detalleCompra: {
				id: 'detalleCompra',
				to: '/compras/detalle-compra/:id',
				text: 'Detalle Compra',
				icon: 'HeroDocument',
				authority: []
			}
		}
	},

	bodega: {
		id: 'bodega',
		to: '/bodega',
		text: 'Bodega',
		icon: 'DuoCommode2',
		authority: [],
		subPages: {
			listaBodegas: {
				id: 'listaBodegas',
				to: '/bodega/lista-bodegas',
				text: 'Bodegas',
				icon: 'DuoSafe',
				authority: []
			},
			listaGuiaSalida: {
				id: 'listaGuiaSalida',
				to: '/bodega/lista-guia-salida',
				text: 'Guias de Salida',
				icon: 'HeroDocumentArrowUp',
				authority: []
			},
			detalleBodega: {
				id: 'detalleBodega',
				to: '/bodega/detalle-bodega/:id',
				text: 'Detalle Bodega',
				icon: 'DuoSafe',
				authority: [],
			},
			detalleGuiaSalidaBodega: {
				id: 'detalleGuiaSalidaBodega',
				to: '/bodega/detalle-guia-salida-bodega/:id',
				text: 'Detalle Guia de Salida de Bodega',
				icon: 'HeroDocument',
				authority: []
			},
			devolucionParcialGuiaSalidaBodega: {
				id: 'devolucionParcialGuiaSalidaBodega',
				to: '/bodega/devolucion-parcial-guia-salida-bodega/:id',
				text: 'Devolucion Parcial Guia Salida',
				icon: 'HeroDocument',
				authority: []
			},
			crearItemsGuiaSalidaBodega: {
				id: 'crearItemsGuiaSalidaBodega',
				to: '/bodega/crear-items-guia-salida/:id',
				text: 'Crear Items Guia Salida Bodega',
				icon: 'HeroDocument',
				authority: []
			},
			listaTomaInventario: {
				id: 'listaTomaDeInventario',
				to: '/bodega/tomas-inventarios',
				text: 'Tomas de Inventarios',
				icon: 'HeroDocument',
				authority: []
			},
			detalleTomaInventario: {
				id: 'detalleTomaInventario',
				to: '/bodega/detalle-toma-inventario/:id',
				text: 'Detalle Toma de Inventario',
				icon: 'HeroDocument',
				authority: []
			},
			inventariarTomaInventario: {
				id: 'inventariarTomaInventario',
				to: '/bodega/inventariar-toma-inventario/:id',
				text: 'Inventariar Toma Inventario',
				icon: 'HeroDocument',
				authority: []
			}
		}
	},

	ordenTrabajo: {
		id: 'ordenTrabajo',
		to: '/orden-trabajo',
		text: 'Orden Trabajo',
		icon: 'DuoMailbox',
		authority: [],
		subPages: {
			listaOrdenesTrabajo: {
				id: 'listaOrdenesTrabajo',
				to: '/orden-trabajo/lista-ordenes-trabajo',
				text: 'Ordenes Trabajo',
				icon: 'DuoMailbox',
				authority: []
			},
			detalleOrdenTrabajo: {
				id: 'detalleOrdenTrabajo',
				to: '/orden-trabajo/detalle-orden-trabajo/:id',
				text: 'Detalle Orden Trabajo',
				icon: 'HeroDocument',
				authority: []
			},
			listaVisitasSoporte: {
				id: 'listaVisitasSoporte',
				to: '/orden-trabajo/lista-visitas-soporte',
				text: 'Asistencias Técnicas',
				icon: 'DuoMailbox',
				authority: []
			},
			detalleVisitaSoporte: {
				id: 'detalleVisitaSoporte',
				to: '/orden-trabajo/detalle-visita-soporte/:id',
				text: 'Detalle Visita Soporte',
				icon: 'DuoMailbox',
				authority: []
			},
			agregarItemsACompraDT: {
				id: 'agregarItemsACompraDT',
				to: '/orden-trabajo/:idOrden/detalle-orden-trabajo/:idDetalle/agregar-items-compra',
				text: 'Agregar Item a la Compra',
				icon: 'HeroDocument',
				authority: []
			},
			vistaPreviaAdjunto: {
				id: 'vistaPreviaAdjunto',
				to: '/orden-trabajo/:idOrden/vista-previa-adjunto/:id',
				text: 'Vista Previa Adjunto',
				icon: 'HeroDocument',
				authority: []
			},
			detalleRetroalimentacionOT: {
				id: 'detalleRetroalimentacionOT',
				to: '/orden-trabajo/detalle-retroalimentacion/:id',
				text: 'Detalle Retroalimentacion OT',
				icon: 'HeroDocument',
				authority: []
			}
		}
	},

	registros: {
		id: 'registros',
		to: '/registros',
		text: 'Registros',
		icon: 'DuoPuzzle',
		authority: [],
		subPages: {
			listaCategorias: {
				id: 'listaCategorias',
				to: '/registros/lista-categorias',
				text: 'Categorias',
				icon: 'HeroDocument',
				authority: []
			},
			listaFabricantes: {
				id: 'listaFabricantes',
				to: '/registros/lista-fabricantes',
				text: 'Fabricantes',
				icon: 'HeroDocument',
				authority: []
			},
			listaProveedoresEmpresa: {
				id: 'listaFabricanteThunk',
				to: '/registros/lista-proveedores-empresa',
				text: 'Proveedores',
				icon: 'HeroDocument',
				authority: []
			},
			detalleProveedorEmpresa: {
				id: 'detalleProveedorEmpresa',
				to: '/registros/detalle-proveedor-empresa/:id',
				text: 'Detalle Proveedor Empresa',
				icon: 'HeroDocument',
				authority: []
			},
			listaItemsEmpresa: {
				id: 'listaItemsEmpresa',
				to: '/registros/lista-items-empresa',
				text: 'Items',
				icon: 'HeroDocument',
				authority: []
			},
			listaUsuarios: {
				id: 'listaUsuarios',
				to: '/registros/lista-usuarios',
				text: 'Usuarios',
				icon: 'HeroDocument',
				authority: []
			},
			detalleFabricante:{
				id: 'detalleFabricante',
				to: '/registros/detalle-fabricante/:id',
				text: 'Detalle Fabricante',
				icon: 'HeroDocument',
				authority: []
			},
			detalleCategoria:{
				id: 'detalleCategoria',
				to: '/registros/detalle-categoria/:id',
				text: 'Detalle Categoria',
				icon: 'HeroDocument',
				authority: []
			},
			detalleItemEmpresa: {
				id: 'detalleItemEmpresa',
				to: '/registros/detalle-item-empresa/:id',
				text: 'Detalle Item Empresa',
				icon: 'HeroDocument',
				authority: []
			},
		}
	},

	vacaciones: {
		id: 'vacaciones',
		to: '/vacaciones',
		text: 'Vacaciones',
		icon: 'DuoSunFog',
		authority: [],
		subPages: {
			pedirVacacionesUsuario: {
				id: 'pedirVacacionesUsuario',
				to: '/vacaciones/pedir-vacaciones-usuario',
				text: 'Pedir Vacaciones Usuario',
				icon: 'DuoSunset2',
				authority: [],
			},
			pedirVacaciones: {
				id: 'pedirVacaciones',
				to: '/vacaciones/pedir-vacaciones',
				text: 'Pedir Vacaciones',
				icon: 'DuoSunset1',
				authority: [],
			},
			listaMisSolicitudesVacaciones: {
				id: 'listaMisSolicitudesVacaciones',
				to: '/vacaciones/lista-mis-solicitudes',
				text: 'Lista Mis Solicitudes Vacaciones',
				icon: 'DuoBulletList',
				authority: []
			},
                        listaSolicitudesVacaciones: {
                                id: 'listaSolicitudesVacaciones',
                                to: '/vacaciones/lista-solicitudes-vacaciones',
                                text: 'Solicitudes Vacaciones',
                                icon: 'DuoBulletList',
                                authority: []
                        },
                        dashboardVacaciones: {
                                id: 'dashboardVacaciones',
                                to: '/vacaciones/dashboard',
                                text: 'Dashboard Vacaciones',
                                icon: 'DuoChartBar1',
                                authority: []
                        },
                        detalleSolicitudVacaciones: {
                                id: 'detalleSolicitudVacaciones',
                                to: '/vacaciones/detalle-solicitud-vacaciones/:id',
                                text: 'Detalle Solicitud Vacaciones',
                                icon: 'DuoBulletList',
				authority: []
			},
			pdfSolicitudVacaciones: {
				id: 'pdfSolicitudVacaciones',
				to: '/vacaciones/pdf-solicitud/:id',
				text: 'PDF Solicitud Vacacion',
				icon: 'HeroDocument',
				authority: []
			},
		}
	},

	recursos: {
		id: 'recursos',
		to: '/recursos',
		text: 'Recursos',
		icon: 'DuoTv1',
		authority: [],
		subPages: {
			// listaEquiposDeMisClientes: {
			// 	id: 'listaEquiposDeMisClientes',
			// 	to: '/recursos/lista-equipos-clientes',
			// 	text: 'Lista de Equipos de mis Clientes',
			// 	icon: 'HeroDocument',
			// 	authority: []
			// },
			listaSoftware: {
				id: 'listaSoftware',
				to: '/recursos/lista-software',
				text: 'Softwares',
				icon: 'DuoLaptop',
				authority: []
			}
		}
	},

	rendiciones: {
		id: 'rendiciones',
		to: '/rendicion',
		text: 'Rendiciones',
		icon: 'DuoDollar',
		authority: [],
		subPages: {
			listaRendiciones: {
				id: 'listaRendiciones',
				to: '/rendicion/lista-rendiciones',
				text: 'Rendiciones Admin',
				icon: 'DuoDollar',
				authority: []
			},
			detalleRendicion: {
				id: 'detalleRendicion',
				to: '/rendicion/detalle-rendicion/:id',
				text: 'Detalle Rendicion',
				icon: 'DuoDollar',
				authority: []
			},
			listaMisRendiciones: {
				id: 'listaMisRendiciones',
				to: '/rendicion/lista-mis-rendiciones',
				text: 'Mis Rendiciones',
				icon: 'DuoDollar',
				authority: []
			},
			listaFacturaciones: {
				id: 'listaFacturaciones',
				to: '/facturacion/lista-facturaciones',
				text: 'Facturaciones',
				icon: 'DuoReceipt',
				authority: []
			},
			cierreOTDetalle: {
				id: 'cierreOTDetalle',
				to: '/facturacion/cierre-ot/:id',
				text: 'Cierre OT Detalle',
				icon: 'DuoReceipt',
				authority: []
			}
		}
	},

	listaInvitacionesEmpresas: {
		id: 'listaInvitacionesEmpresas',
		to: '/invitaciones-empresas',
		text: 'Invitaciones',
		icon: 'DuoMailbox2',
		authority: [],
	},
	listaDiasCalendario: {
		id: 'listaDiasCalendario',
		to: '/lista-dias-calendario',
		text: 'Dias Calendario',
		icon: 'HeroCalendar',
		authority: [],
	},
	listaEquiposEmpresa: {
		id: 'listaEquiposEmpresa',
		to: '/lista-equipos-empresa',
		text: 'Equipos Empresa',
		icon: 'HeroDocument',
		authority: []
	},
	detalleEquipoEmpresa: {
		id: 'detalleEquipoEmpresa',
		to: '/detalle-equipo-empresa/:id',
		text: 'Detalle Equipo Empresa',
		icon: 'HeroDocument',
		authority: []
	},
	detalleSucursal: {
		id: 'detalleSucursal',
		to: '/empresas/:id_empresa/detalle-sucursal/:id',
		text: 'Detalle Sucursal',
		icon: 'HeroDocument',
		authority: []
	},
};


const pagesConfig = {
	...authPages,
	...Pages
};

export default pagesConfig;
