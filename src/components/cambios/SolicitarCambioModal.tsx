import React, { useState, useMemo, useEffect } from 'react';
import { Persona, ServicioDia, SlotServicioTipo } from '../../types';
import {
  crearSolicitudCambio,
  validarViabilidadCambio,
} from '../../services/cambiosService';
import {
  ArrowRightLeft,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  X,
  Send,
  ShieldAlert,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface SolicitarCambioModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuadranteId: string;
  currentPersona: Persona;
  currentUid?: string;
  personas: Persona[];
  servicios: ServicioDia[];
  preselectedServicioId?: string;
  preselectedSlotTipo?: SlotServicioTipo;
  onSuccess: () => void;
}

export const SolicitarCambioModal: React.FC<SolicitarCambioModalProps> = ({
  isOpen,
  onClose,
  cuadranteId,
  currentPersona,
  currentUid,
  personas,
  servicios,
  preselectedServicioId,
  preselectedSlotTipo,
  onSuccess,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];

  const isUS =
    currentPersona.tipoServicio === 'US' ||
    currentPersona.grupo === 'US_SEGURIDAD' ||
    (servicios && servicios.length > 0 && (servicios[0] as any).diurno !== undefined);

  // 1. Filtrar servicios futuros asignados a currentPersona (tanto titulares como imaginarias)
  const misServiciosFuturos = useMemo(() => {
    const lista: {
      servicio: ServicioDia;
      slotTipo: SlotServicioTipo;
      tipoCambio: 'SERVICIO' | 'IMAGINARIA';
      tipoTurnoUS?: 'DIURNO' | 'NOCTURNO' | 'IMAGINARIA';
      esTitularOriginal: boolean;
      label: string;
      horarioTexto?: string;
      key: string;
    }[] = [];

    (servicios || []).forEach((sRaw) => {
      const s = sRaw as any;
      if (!s || s.fecha < hoyStr) return;

      if (isUS) {
        // TURNOS DE LA U.S. (UNIDAD DE SEGURIDAD - 12h)
        const dTit = s.diurno?.titulares || [];
        const nTit = s.nocturno?.titulares || [];

        // Diurnos (07:00 a 19:00)
        if (dTit[0]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'diurno_1' as SlotServicioTipo,
            tipoCambio: 'SERVICIO',
            tipoTurnoUS: 'DIURNO',
            esTitularOriginal: dTit[0]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} — Turno DIURNO (12h)`,
            horarioTexto: '07:00 h → 19:00 h (12 Horas)',
            key: `${s.id}_diurno_1`,
          });
        } else if (dTit[1]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'diurno_2' as SlotServicioTipo,
            tipoCambio: 'SERVICIO',
            tipoTurnoUS: 'DIURNO',
            esTitularOriginal: dTit[1]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} — Turno DIURNO (12h)`,
            horarioTexto: '07:00 h → 19:00 h (12 Horas)',
            key: `${s.id}_diurno_2`,
          });
        }

        // Nocturnos (19:00 a 07:00 / 07:45)
        const hNoc = s.esNocturnoProlongado ? '12.75h' : '12h';
        const finNoc = s.esNocturnoProlongado ? '07:45' : '07:00';
        if (nTit[0]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'nocturno_1' as SlotServicioTipo,
            tipoCambio: 'SERVICIO',
            tipoTurnoUS: 'NOCTURNO',
            esTitularOriginal: nTit[0]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} — Turno NOCTURNO (${hNoc})`,
            horarioTexto: `19:00 h → ${finNoc} h (${hNoc})`,
            key: `${s.id}_nocturno_1`,
          });
        } else if (nTit[1]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'nocturno_2' as SlotServicioTipo,
            tipoCambio: 'SERVICIO',
            tipoTurnoUS: 'NOCTURNO',
            esTitularOriginal: nTit[1]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} — Turno NOCTURNO (${hNoc})`,
            horarioTexto: `19:00 h → ${finNoc} h (${hNoc})`,
            key: `${s.id}_nocturno_2`,
          });
        }

        // Imaginaria U.S. (24h)
        if (s.imaginaria?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'imaginaria_us' as SlotServicioTipo,
            tipoCambio: 'IMAGINARIA',
            tipoTurnoUS: 'IMAGINARIA',
            esTitularOriginal: s.imaginaria?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} — IMAGINARIA U.S. (24h)`,
            horarioTexto: '00:00 h → 24:00 h (24 Horas)',
            key: `${s.id}_imaginaria_us`,
          });
        }
      } else {
        // TURNOS DE 24 HORAS (U.G.)
        const tRol1 = s.titulares?.rol1 || [];
        const tRol2 = s.titulares?.rol2 || [];
        const imagRol1 = s.imaginarias?.rol1;
        const imagRol2 = s.imaginarias?.rol2;

        // Titulares
        if (tRol1[0]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'rol1_1',
            tipoCambio: 'SERVICIO',
            esTitularOriginal: tRol1[0]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 1 Titular 1`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_rol1_1`,
          });
        } else if (tRol1[1]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'rol1_2',
            tipoCambio: 'SERVICIO',
            esTitularOriginal: tRol1[1]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 1 Titular 2`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_rol1_2`,
          });
        } else if (tRol2[0]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'rol2_1',
            tipoCambio: 'SERVICIO',
            esTitularOriginal: tRol2[0]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 2 Titular 1`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_rol2_1`,
          });
        } else if (tRol2[1]?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'rol2_2',
            tipoCambio: 'SERVICIO',
            esTitularOriginal: tRol2[1]?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 2 Titular 2`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_rol2_2`,
          });
        }

        // Imaginarias
        if (imagRol1?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'imaginaria_rol1',
            tipoCambio: 'IMAGINARIA',
            esTitularOriginal: imagRol1?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 1 de IMAGINARIA`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_imaginaria_rol1`,
          });
        } else if (imagRol2?.personaIdReal === currentPersona.id) {
          lista.push({
            servicio: s,
            slotTipo: 'imaginaria_rol2',
            tipoCambio: 'IMAGINARIA',
            esTitularOriginal: imagRol2?.personaIdOriginal === currentPersona.id,
            label: `${s.fecha} (${s.esFinDeSemana ? 'FIN DE SEMANA' : 'Laborable'}) — ROL 2 de IMAGINARIA`,
            horarioTexto: '08:00 h → 08:00 h (24 Horas)',
            key: `${s.id}_imaginaria_rol2`,
          });
        }
      }
    });

    return lista.sort((a, b) => a.servicio.fecha.localeCompare(b.servicio.fecha));
  }, [servicios, currentPersona.id, hoyStr, isUS]);

  const [selectedServicioKey, setSelectedServicioKey] = useState<string>('');
  const [destinatarioId, setDestinatarioId] = useState<string>('');
  const [proponeDevolucion, setProponeDevolucion] = useState<boolean>(false);
  const [fechaDevolucionPropuesta, setFechaDevolucionPropuesta] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [firmaDigitalPin, setFirmaDigitalPin] = useState<string>('');
  const [firmaAceptada, setFirmaAceptada] = useState<boolean>(true);
  const [enviando, setEnviando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solicitudEnviadaConExito, setSolicitudEnviadaConExito] = useState<{
    destinatarioNombre: string;
    destinatarioEmpleo: string;
    fecha: string;
  } | null>(null);

  // Inicializar o auto-seleccionar servicio si viene preseleccionado
  useEffect(() => {
    if (!isOpen) {
      setSolicitudEnviadaConExito(null);
      return;
    }

    if (preselectedServicioId) {
      const match = misServiciosFuturos.find(
        (item) =>
          item.servicio.id === preselectedServicioId &&
          (!preselectedSlotTipo || item.slotTipo === preselectedSlotTipo)
      );
      if (match) {
        setSelectedServicioKey(match.key);
        return;
      }
    }

    if (misServiciosFuturos.length === 1) {
      setSelectedServicioKey(misServiciosFuturos[0].key);
    } else if (misServiciosFuturos.length > 0 && !selectedServicioKey) {
      setSelectedServicioKey(misServiciosFuturos[0].key);
    }
  }, [isOpen, preselectedServicioId, preselectedSlotTipo, misServiciosFuturos]);

  // Selección activa del servicio a cambiar
  const itemSeleccionado = misServiciosFuturos.find(
    (item) => item.key === selectedServicioKey
  );

  // Calcular compañeros COMPATIBLES en tiempo real para el servicio seleccionado
  const candidatosCompatibles = useMemo(() => {
    if (!itemSeleccionado) return [];

    const fechaServicio = itemSeleccionado.servicio.fecha;
    const esImaginaria = itemSeleccionado.tipoCambio === 'IMAGINARIA';

    // Filtrar personas: en US todos los efectivos de la US; en UG mismo empleo
    const companerosFiltrados = isUS
      ? personas.filter(
          (p) =>
            p.activo &&
            p.id !== currentPersona.id &&
            (p.tipoServicio === 'US' || p.grupo === 'US_SEGURIDAD' || currentPersona.tipoServicio === 'US')
        )
      : personas.filter(
          (p) => p.activo && p.empleo === currentPersona.empleo && p.id !== currentPersona.id
        );

    // Evaluar compatibilidad dura con el motor de reglas
    const compatibles = companerosFiltrados.filter((dest) => {
      const check = validarViabilidadCambio(
        currentPersona,
        dest,
        fechaServicio,
        servicios,
        esImaginaria ? 'IMAGINARIA' : 'SERVICIO',
        itemSeleccionado.slotTipo,
        itemSeleccionado.tipoTurnoUS
      );
      return check.valido;
    });

    return compatibles.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [itemSeleccionado, personas, currentPersona, servicios, isUS]);

  // Auto-seleccionar primer candidato compatible si el seleccionado ya no es compatible
  useEffect(() => {
    if (candidatosCompatibles.length > 0) {
      if (!destinatarioId || !candidatosCompatibles.some((c) => c.id === destinatarioId)) {
        setDestinatarioId(candidatosCompatibles[0].id);
      }
    } else {
      setDestinatarioId('');
    }
  }, [candidatosCompatibles]);

  const destinatarioSeleccionado = personas.find((p) => p.id === destinatarioId);

  // Pre-validación
  const validacionEnVivo = useMemo(() => {
    if (!itemSeleccionado || !destinatarioSeleccionado) return null;
    return validarViabilidadCambio(
      currentPersona,
      destinatarioSeleccionado,
      itemSeleccionado.servicio.fecha,
      servicios,
      itemSeleccionado.tipoCambio === 'IMAGINARIA' ? 'IMAGINARIA' : 'SERVICIO',
      itemSeleccionado.slotTipo,
      itemSeleccionado.tipoTurnoUS
    );
  }, [itemSeleccionado, destinatarioSeleccionado, currentPersona, servicios]);

  // Posibles guardias del destinatario para proponer devolución
  const serviciosDestinatarioFuturos = useMemo(() => {
    if (!destinatarioSeleccionado) return [];
    const lista: { id: string; fecha: string; label: string; slotTipo?: SlotServicioTipo }[] = [];

    (servicios || []).forEach((sRaw) => {
      const s = sRaw as any;
      if (!s || s.fecha <= (itemSeleccionado?.servicio.fecha || hoyStr)) return;

      if (isUS) {
        const dTit = s.diurno?.titulares || [];
        const nTit = s.nocturno?.titulares || [];
        if (dTit.some((t: any) => t?.personaIdReal === destinatarioSeleccionado.id)) {
          lista.push({
            id: s.id,
            fecha: s.fecha,
            label: `${s.fecha} — Turno DIURNO (12h • 07:00 a 19:00)`,
            slotTipo: 'diurno_1' as SlotServicioTipo,
          });
        } else if (nTit.some((t: any) => t?.personaIdReal === destinatarioSeleccionado.id)) {
          const hNoc = s.esNocturnoProlongado ? '12.75h' : '12h';
          lista.push({
            id: s.id,
            fecha: s.fecha,
            label: `${s.fecha} — Turno NOCTURNO (${hNoc})`,
            slotTipo: 'nocturno_1' as SlotServicioTipo,
          });
        }
      } else {
        const tRol1 = s.titulares?.rol1 || [];
        const tRol2 = s.titulares?.rol2 || [];
        if (tRol1.some((c: any) => c?.personaIdReal === destinatarioSeleccionado.id)) {
          lista.push({
            id: s.id,
            fecha: s.fecha,
            label: `${s.fecha} (${s.esFinDeSemana ? 'Fin de Semana' : 'Laborable'}) — ROL 1 (24h)`,
            slotTipo: 'rol1_1',
          });
        } else if (tRol2.some((so: any) => so?.personaIdReal === destinatarioSeleccionado.id)) {
          lista.push({
            id: s.id,
            fecha: s.fecha,
            label: `${s.fecha} (${s.esFinDeSemana ? 'Fin de Semana' : 'Laborable'}) — ROL 2 (24h)`,
            slotTipo: 'rol2_1',
          });
        }
      }
    });

    return lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [destinatarioSeleccionado, itemSeleccionado, servicios, hoyStr, isUS]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemSeleccionado || !destinatarioSeleccionado) {
      setErrorMsg('Por favor selecciona un servicio/imaginaria y un compañero compatible.');
      return;
    }

    if (validacionEnVivo && !validacionEnVivo.valido) {
      setErrorMsg(validacionEnVivo.motivo || 'El cambio genera incompatibilidades en el cuadrante.');
      return;
    }

    if (!firmaAceptada) {
      setErrorMsg('Debes aceptar la declaración de firma electrónica oficial.');
      return;
    }

    setEnviando(true);
    setErrorMsg(null);

    const nowIso = new Date().toISOString();
    const firmaDigital = {
      firmado: true,
      fechaHora: nowIso,
      ip: '127.0.0.1 (Autenticado)',
      identificadorFirmante: currentPersona.dni || currentPersona.id,
      nombreCompleto: currentPersona.nombre,
      empleo: currentPersona.empleo,
    };

    const srvDevolucion = serviciosDestinatarioFuturos.find((s) => s.fecha === fechaDevolucionPropuesta);

    try {
      const res = await crearSolicitudCambio({
        cuadranteId,
        tipoCambio: itemSeleccionado.tipoCambio,
        servicioId: itemSeleccionado.servicio.id,
        fechaServicio: itemSeleccionado.servicio.fecha,
        puesto: currentPersona.empleo,
        slotTipo: itemSeleccionado.slotTipo,
        solicitante: currentPersona,
        solicitanteUid: currentUid,
        destinatario: destinatarioSeleccionado,
        motivo,
        servicioDevolucionId: srvDevolucion?.id,
        servicioDevolucionFecha: proponeDevolucion ? fechaDevolucionPropuesta : undefined,
        firmaSolicitante: JSON.stringify(firmaDigital),
        servicios,
      });

      if (res.success) {
        setSolicitudEnviadaConExito({
          destinatarioNombre: destinatarioSeleccionado.nombre,
          destinatarioEmpleo: destinatarioSeleccionado.empleo,
          fecha: itemSeleccionado.label,
        });
        onSuccess();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(`Error al procesar la solicitud: ${err.message || err}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {solicitudEnviadaConExito ? 'Confirmación de Envío' : 'Solicitar Cambio Oficial'}
              </h3>
              <p className="text-xs text-slate-300">
                {solicitudEnviadaConExito
                  ? 'Procedimiento reglamentario y circuito de notificaciones activado'
                  : 'Petición de cambio de Servicio o Imaginaria con firma electrónica y ratificación'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {solicitudEnviadaConExito ? (
          /* ================= PANTALLA DE ÉXITO Y PASOS DE NOTIFICACIÓN ================= */
          <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                ¡Solicitud de Cambio Enviada Correctamente!
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tu solicitud para <strong>{solicitudEnviadaConExito.fecha}</strong> ha sido registrada con tu firma electrónica.
              </p>
            </div>

            {/* Pasos explicativos del circuito reglamentario */}
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Aviso a tu compañero</h5>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Se ha notificado a <strong>{solicitudEnviadaConExito.destinatarioNombre}</strong> ({solicitudEnviadaConExito.destinatarioEmpleo}) en su buzón del portal.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Notificación al responder</h5>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    El sistema te avisará mediante una notificación (campana) en cuanto tu compañero <strong>acepte tu propuesta</strong> o te plantee una <strong>contraoferta</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">Resolución del Administrador / Mando</h5>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Una vez aceptada por ambos, pasará al Mando para su ratificación. Te llegará una notificación formal cuando sea <strong>aprobada</strong> o el motivo detallado si es <strong>denegada</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Entendido y Cerrar</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong>Incompatibilidad:</strong> {errorMsg}
              </div>
            </div>
          )}

          {/* 1. Guardia o Imaginaria a cambiar */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              1. Servicio o Imaginaria a Cambiar
            </label>
            {misServiciosFuturos.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                No tienes servicios ni imaginarias futuras programadas en este ciclo.
              </div>
            ) : (
              <select
                value={selectedServicioKey}
                onChange={(e) => setSelectedServicioKey(e.target.value)}
                className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {misServiciosFuturos.map((item) => (
                  <option key={item.key} value={item.key}>
                    [{item.tipoCambio}] {item.label} {item.horarioTexto ? `(${item.horarioTexto})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Selección de Compañero Filtrado por Compatibilidad Estricta */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-500" />
                2. Compañero Destinatario ({isUS ? 'U.S. Seguridad' : currentPersona.empleo})
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                {candidatosCompatibles.length} compatible(s)
              </span>
            </div>

            {candidatosCompatibles.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Sin candidatos compatibles disponibles:</strong>{' '}
                  {isUS
                    ? 'Todos los compañeros de la U.S. tienen asignado servicio en esa fecha, incompatibilidad de solapamiento nocturno/diurno (24h prohibidas) o imaginaria en días adyacentes.'
                    : 'Todos los compañeros de tu empleo tienen servicio asignado en esa fecha o en días adyacentes (delante y detrás de un servicio de 24h debe haber siempre un día libre).'}
                </div>
              </div>
            ) : (
              <select
                value={destinatarioId}
                onChange={(e) => setDestinatarioId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                {candidatosCompatibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.grupo || (isUS ? 'U.S.' : 'U.G.')}) — Compatible
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Indicador de Viabilidad */}
          {validacionEnVivo && validacionEnVivo.valido && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>CAMBIO COMPATIBLE:</strong>{' '}
                {isUS
                  ? 'Cumple la normativa de la U.S. (sin solapamientos nocturno-diurno ni 24h continuas; descanso e imaginarias compatibles).'
                  : 'El compañero no tiene servicios en fechas adyacentes. Descanso reglamentario de 24h respetado (un día libre antes y después).'}
              </span>
            </div>
          )}

          {/* 3. Propuesta de Devolución Recíproca (Opcional) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={proponeDevolucion}
                onChange={(e) => setProponeDevolucion(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Proponer devolver el servicio en una fecha concreta
              </span>
            </label>

            {proponeDevolucion && (
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Fecha propuesta para cubrir al compañero:
                </label>
                {serviciosDestinatarioFuturos.length > 0 ? (
                  <select
                    value={fechaDevolucionPropuesta}
                    onChange={(e) => setFechaDevolucionPropuesta(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2"
                  >
                    <option value="">-- Seleccionar fecha de su cuadrante --</option>
                    {serviciosDestinatarioFuturos.map((s) => (
                      <option key={s.id} value={s.fecha}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="date"
                    min={itemSeleccionado?.servicio.fecha || hoyStr}
                    value={fechaDevolucionPropuesta}
                    onChange={(e) => setFechaDevolucionPropuesta(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2"
                  />
                )}
              </div>
            )}
          </div>

          {/* 4. Motivo Opcional */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              4. Motivo del Cambio
            </label>
            <textarea
              rows={2}
              placeholder="Asuntos propios, cambio acordado, conciliación personal/familiar, etc."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full text-xs text-slate-900 bg-white border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* 5. Firma Electrónica Reglamentaria */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Firma Electrónica del Solicitante:</span>
            </div>
            <div className="text-[11px] text-blue-900/90 leading-tight">
              Certifico la veracidad de la presente solicitud y el compromiso de cumplimiento del servicio acordado una vez ratificado.
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={firmaAceptada}
                onChange={(e) => setFirmaAceptada(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-900">
                Firmar electrónicamente como {currentPersona.nombre} ({currentPersona.empleo})
              </span>
            </label>
          </div>

          {/* Acciones */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                !itemSeleccionado ||
                !destinatarioSeleccionado ||
                candidatosCompatibles.length === 0 ||
                (validacionEnVivo !== null && !validacionEnVivo.valido) ||
                !firmaAceptada ||
                enviando
              }
              className="px-5 py-2.5 text-xs text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-bold flex items-center gap-1.5 transition disabled:opacity-40 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {enviando ? 'Firmando y Enviando...' : 'Firmar y Enviar Solicitud'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
