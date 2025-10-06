// Variables globales
let personal = [];
let turnos = {}
let currentUser = null; // sesión actual: { username, role }
let adminIdleTimer = null; // temporizador de inactividad para admin
let adminActivityHandler = null; // handler para reiniciar temporizador

// Silenciar logs en consola por defecto (se pueden reactivar con localStorage 'vigilancia-debug-logs')
(function() {
    const original = {
        log: console.log,
        info: console.info,
        debug: console.debug,
        table: console.table,
        trace: console.trace
    };
    const noop = function(){};
    const enabled = localStorage.getItem('vigilancia-debug-logs') === 'true';
    function silence() {
        console.log = noop;
        console.info = noop;
        console.debug = noop;
        console.table = noop;
        console.trace = noop;
    }
    function restore() {
        console.log = original.log;
        console.info = original.info;
        console.debug = original.debug;
        console.table = original.table;
        console.trace = original.trace;
    }
    if (!enabled) silence();
    window.setDebugLogging = function(on) {
        localStorage.setItem('vigilancia-debug-logs', on ? 'true' : 'false');
        if (on) restore(); else silence();
    };
})();

// Función para manejar el cambio de tipo de turno y mostrar campos condicionales
function handleTipoTurnoChange() {
    const tipoTurno = document.getElementById('turno-tipo').value;
    const horarioGroup = document.querySelector('.horario-group');
    
    // Ocultar todos los campos condicionales
    hideAllConditionalFields();
    
    // Ocultar o mostrar campos de horario según el tipo de turno
    const tiposSinHorario = ['vacaciones', 'estres', 'dia_estudio', 'ausente'];
    if (tiposSinHorario.includes(tipoTurno)) {
        horarioGroup.style.display = 'none';
    } else {
        horarioGroup.style.display = 'block';
    }
    
    // Mostrar campos específicos según el tipo seleccionado
    switch(tipoTurno) {
        case 'vacaciones':
        case 'estres':
            document.getElementById('campos-vacaciones-estres').style.display = 'block';
            break;
        case 'carpeta_medica':
            document.getElementById('campos-carpeta-medica').style.display = 'block';
            break;
        case 'compensatorio':
            document.getElementById('campos-compensatorio').style.display = 'block';
            break;
        case 'cambios_guardia':
            document.getElementById('campos-cambios-guardia').style.display = 'block';
            break;
        case 'articulo26':
            document.getElementById('campos-articulo26').style.display = 'block';
            updateArticulo26Counter();
            break;
    }
}

// Función para ocultar todos los campos condicionales
function hideAllConditionalFields() {
    const conditionalFields = document.querySelectorAll('.conditional-fields');
    conditionalFields.forEach(field => {
        field.style.display = 'none';
    });
}
// Poblar el selector de compañero con el listado actual de personal
function populateCompaneroSelect() {
    const select = document.getElementById('companero-cambio');
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '<option value="">Seleccione un compañero…</option>';
    personal.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.apellido}, ${p.nombre}`;
        select.appendChild(opt);
    });
    if (previous && personal.some(p => p.id === previous)) {
        select.value = previous;
    }
}

// Función para actualizar el contador de Artículo 26
function updateArticulo26Counter() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Contar días de Artículo 26 utilizados este año
    let diasUtilizados = 0;
    let mesUtilizado = false;
    
    Object.keys(turnos).forEach(fecha => {
        const fechaTurno = new Date(fecha);
        if (fechaTurno.getFullYear() === currentYear) {
            Object.values(turnos[fecha]).forEach(turno => {
                if (turno.tipo === 'articulo26') {
                    diasUtilizados++;
                    if (fechaTurno.getMonth() === currentMonth) {
                        mesUtilizado = true;
                    }
                }
            });
        }
    });
    
    // Actualizar la interfaz
    document.getElementById('dias-utilizados').textContent = diasUtilizados;
    document.getElementById('mes-utilizado').textContent = mesUtilizado ? 'Sí' : 'No';
    
    // Cambiar color si se acerca al límite
    const contadorElement = document.getElementById('articulo26-contador');
    if (diasUtilizados >= 6) {
        contadorElement.style.color = '#dc3545'; // Rojo
    } else if (diasUtilizados >= 4) {
        contadorElement.style.color = '#ffc107'; // Amarillo
    } else {
        contadorElement.style.color = '#6c757d'; // Gris normal
    }
}

// Función para validar Artículo 26
function validateArticulo26(fecha) {
    const currentDate = new Date(fecha);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let diasUtilizados = 0;
    let mesUtilizado = false;
    
    Object.keys(turnos).forEach(fechaTurno => {
        const fechaTurnoDate = new Date(fechaTurno);
        if (fechaTurnoDate.getFullYear() === currentYear) {
            Object.values(turnos[fechaTurno]).forEach(turno => {
                if (turno.tipo === 'articulo26') {
                    diasUtilizados++;
                    if (fechaTurnoDate.getMonth() === currentMonth && fechaTurno !== fecha) {
                        mesUtilizado = true;
                    }
                }
            });
        }
    });
    
    if (diasUtilizados >= 6) {
        return { valid: false, message: 'Ya se han utilizado los 6 días anuales de Artículo 26' };
    }
    
    if (mesUtilizado) {
        return { valid: false, message: 'Ya se ha utilizado un día de Artículo 26 este mes' };
    }
    
    return { valid: true };
}

// Función para cargar datos de campos condicionales al editar
function loadConditionalFieldsData(turno) {
    switch(turno.tipo) {
        case 'vacaciones':
        case 'estres':
            if (turno.fechaInicio) document.getElementById('fecha-inicio').value = turno.fechaInicio;
            if (turno.fechaFin) document.getElementById('fecha-fin').value = turno.fechaFin;
            break;
        case 'carpeta_medica':
            if (turno.fechaInicioCarpeta) document.getElementById('fecha-inicio-carpeta').value = turno.fechaInicioCarpeta;
            if (turno.fechaAlta) document.getElementById('fecha-alta').value = turno.fechaAlta;
            break;
        case 'compensatorio':
            if (turno.fechaCompensatorio) document.getElementById('fecha-compensatorio').value = turno.fechaCompensatorio;
            if (turno.fechaTrabajoRealizado) document.getElementById('fecha-trabajo-realizado').value = turno.fechaTrabajoRealizado;
            break;
        case 'cambios_guardia': {
            const select = document.getElementById('companero-cambio');
            if (turno.companeroCambio && select) {
                const hasId = personal.some(p => p.id === turno.companeroCambio);
                if (hasId) {
                    select.value = turno.companeroCambio;
                } else {
                    const opt = Array.from(select.options).find(o => o.textContent === turno.companeroCambio);
                    if (opt) select.value = opt.value;
                }
            }
            const fechaDevolucionInput = document.getElementById('fecha-devolucion');
            if (fechaDevolucionInput && turno.fechaDevolucion) {
                fechaDevolucionInput.value = turno.fechaDevolucion;
            }
            break;
        }
    }
}

// Función para limpiar campos condicionales
function clearConditionalFields() {
    // Limpiar campos de vacaciones/estrés
    document.getElementById('fecha-inicio').value = '';
    document.getElementById('fecha-fin').value = '';
    
    // Limpiar campos de carpeta médica
    document.getElementById('fecha-inicio-carpeta').value = '';
    document.getElementById('fecha-alta').value = '';
    
    // Limpiar campos de compensatorio
    document.getElementById('fecha-compensatorio').value = '';
    document.getElementById('fecha-trabajo-realizado').value = '';
    
    // Limpiar campos de cambios de guardia
    document.getElementById('companero-cambio').value = '';
    const fechaDevolucionInput = document.getElementById('fecha-devolucion');
    if (fechaDevolucionInput) fechaDevolucionInput.value = '';
}; // Cambiar de array a objeto para almacenar turnos por fecha
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isSubmitting = false; // Flag para prevenir múltiples envíos

// Referencias a elementos del DOM
const personalList = document.getElementById('personal-list');
const personalForm = document.getElementById('personal-form');
const personalModal = document.getElementById('personal-modal');
const personalSection = document.getElementById('personal-section');
const addPersonalBtn = document.getElementById('add-personal-btn');
const managePersonalBtn = document.getElementById('manage-personal-btn');
const closePersonalBtn = document.getElementById('close-personal-btn');
const closeButtons = document.querySelectorAll('.close, .cancel-btn');
const deletePersonalBtn = document.getElementById('delete-personal-btn');
const turnoModal = document.getElementById('turno-modal');
const turnoForm = document.getElementById('turno-form');
const deleteTurnoBtn = document.getElementById('delete-turno-btn');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const currentMonthElement = document.getElementById('current-month');
const calendarDays = document.getElementById('calendar-days');
const calendarBody = document.getElementById('calendar-body');
const viewStatsBtn = document.getElementById('view-stats-btn');
const statsSection = document.getElementById('stats-section');
const closeStatsBtn = document.getElementById('close-stats-btn');
const statsList = document.getElementById('stats-list');
const statsNameSelect = document.getElementById('stats-name-select');
// Controles de sesión y login
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const sessionInfo = document.getElementById('session-info');
const userRoleLabel = document.getElementById('user-role-label');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const closeLoginModalBtn = document.getElementById('close-login-modal');
const cancelLoginBtn = document.getElementById('cancel-login');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFileInput = document.getElementById('import-file-input');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
// const downloadExcelBtn = document.getElementById('download-excel-btn'); // eliminado de la UI
// Elementos del menú hamburguesa
const hamburgerBtn = document.getElementById('hamburger-btn');
const hamburgerMenu = document.getElementById('hamburger-menu');
const closeMenuBtn = document.getElementById('close-menu-btn');
const menuOverlay = document.getElementById('menu-overlay');
// Utilidad: cerrar el menú hamburguesa si está abierto
function closeHamburgerMenu() {
    if (hamburgerMenu && hamburgerMenu.classList.contains('open')) {
        hamburgerMenu.classList.remove('open');
        if (menuOverlay) menuOverlay.classList.remove('visible');
        document.body.classList.remove('menu-open');
        hamburgerMenu.setAttribute('aria-hidden', 'true');
        if (menuOverlay) menuOverlay.setAttribute('aria-hidden', 'true');
        // Desactivar interactividad del panel y overlay
        if (hamburgerMenu) hamburgerMenu.setAttribute('inert', '');
        if (menuOverlay) menuOverlay.setAttribute('inert', '');
        // Devolver el foco al botón hamburguesa
        if (hamburgerBtn) hamburgerBtn.focus();
    }
}
// Enlaces de recuperación/creación removidos de la UI

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadSession();
    updateSessionUI();
    setupEventListeners();
    // Mostrar mensajes de cierre previo si aplica
    try {
        const reason = sessionStorage.getItem('logout-reason');
        if (reason) {
            if (reason === 'idle') {
                showNotification('Sesión cerrada por inactividad (3 min).');
            }
            sessionStorage.removeItem('logout-reason');
        }
        // Limpiar flag de recarga (si quedó marcado por beforeunload)
        sessionStorage.removeItem('reloading');
    } catch (e) { /* ignorar */ }
    renderPersonalList();
    populateCompaneroSelect();
    renderCalendar();
    // Overlay de bienvenida: mostrar solo en la primera carga de la sesión
    const welcomeOverlay = document.getElementById('welcome-overlay');
    if (welcomeOverlay) {
        const alreadyShown = sessionStorage.getItem('welcome-shown');
        if (!alreadyShown) {
            sessionStorage.setItem('welcome-shown', '1');
            welcomeOverlay.style.display = 'flex';
            const hide = () => {
                welcomeOverlay.classList.add('fade-out');
                setTimeout(() => { welcomeOverlay.style.display = 'none'; welcomeOverlay.classList.remove('fade-out'); }, 320);
            };
            // Ocultar por tiempo o clic
            setTimeout(hide, 1200);
            welcomeOverlay.addEventListener('click', hide, { once: true });
        } else {
            welcomeOverlay.style.display = 'none';
        }
    }
    
    // Verificar si localStorage está disponible
    if (typeof(Storage) === "undefined") {
        showNotification('Advertencia: Su navegador no soporta localStorage. Los datos no se guardarán.');
    } else {
        console.log('localStorage disponible');
    }
    
    // Verificar si es necesario hacer reset anual
    checkAnnualReset();
});

// Configuración de event listeners
function setupEventListeners() {
    // --- Menú hamburguesa ---
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerMenu.classList.add('open');
            menuOverlay.classList.add('visible');
            document.body.classList.add('menu-open');
            hamburgerMenu.setAttribute('aria-hidden', 'false');
            menuOverlay.setAttribute('aria-hidden', 'false');
            // Activar interactividad del panel y overlay
            if (hamburgerMenu) hamburgerMenu.removeAttribute('inert');
            if (menuOverlay) menuOverlay.removeAttribute('inert');
            // Pasar foco al botón de cerrar para accesibilidad
            const toFocus = document.getElementById('close-menu-btn');
            if (toFocus) toFocus.focus();
        });
    }
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', () => {
            hamburgerMenu.classList.remove('open');
            menuOverlay.classList.remove('visible');
            document.body.classList.remove('menu-open');
            hamburgerMenu.setAttribute('aria-hidden', 'true');
            menuOverlay.setAttribute('aria-hidden', 'true');
            if (hamburgerMenu) hamburgerMenu.setAttribute('inert', '');
            if (menuOverlay) menuOverlay.setAttribute('inert', '');
            if (hamburgerBtn) hamburgerBtn.focus();
        });
    }
    if (menuOverlay) {
        menuOverlay.addEventListener('click', () => {
            hamburgerMenu.classList.remove('open');
            menuOverlay.classList.remove('visible');
            document.body.classList.remove('menu-open');
            hamburgerMenu.setAttribute('aria-hidden', 'true');
            menuOverlay.setAttribute('aria-hidden', 'true');
            if (hamburgerMenu) hamburgerMenu.setAttribute('inert', '');
            if (menuOverlay) menuOverlay.setAttribute('inert', '');
            if (hamburgerBtn) hamburgerBtn.focus();
        });
    }

    // Eventos para el personal
    addPersonalBtn.addEventListener('click', () => {
        if (!isAdmin()) {
            showNotification('Acción restringida. Solo el admin puede gestionar personal.');
            return;
        }
        openPersonalModal();
    });
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.closest('.modal'));
        });
    });
    document.getElementById('cancel-btn').addEventListener('click', () => closeModal(personalModal));
    personalForm.addEventListener('submit', handlePersonalSubmit);

    // Eventos para los turnos
    document.querySelectorAll('.cancel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.closest('.modal'));
        });
    });
    turnoForm.addEventListener('submit', handleTurnoSubmit);
    deleteTurnoBtn.addEventListener('click', handleDeleteTurno);
    
    // Eventos para observaciones
    document.getElementById('observaciones-btn').addEventListener('click', showObservacionesEditMode);
    document.getElementById('save-observaciones').addEventListener('click', saveObservaciones);
    document.getElementById('cancel-observaciones').addEventListener('click', cancelObservacionesEdit);
    
    // Evento para cambio de tipo de turno (campos condicionales)
    document.getElementById('turno-tipo').addEventListener('change', handleTipoTurnoChange);

    // Eventos para el calendario
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    // Eventos para el personal y secciones
    if (managePersonalBtn) {
        managePersonalBtn.addEventListener('click', () => {
            if (!isAdmin()) {
                showNotification('Acción restringida. Solo el admin puede gestionar personal.');
                return;
            }
            closeHamburgerMenu();
            personalSection.style.display = 'block';
            renderPersonalList();
            // Bloquear scroll del fondo cuando se abre la sección de Personal
            lockBodyScroll();
            // Cerrar al hacer clic en overlay
            const overlayHandler = (ev) => {
                if (ev.target === personalSection) {
                    closeModal(personalSection);
                    personalSection.removeEventListener('click', overlayHandler);
                }
            };
            personalSection.addEventListener('click', overlayHandler);
        });
    }
    
    if (closePersonalBtn) {
        closePersonalBtn.addEventListener('click', () => {
            // Usar closeModal para asegurar desbloqueo del scroll
            closeModal(personalSection);
        });
    }
    
    // Eventos para estadísticas
    if (viewStatsBtn) {
        viewStatsBtn.addEventListener('click', () => {
            if (!isAdmin()) {
                showNotification('Acción restringida. Solo el admin puede ver estadísticas.');
                return;
            }
            closeHamburgerMenu();
            statsSection.style.display = 'block';
            // Poblar selector de nombres
            populateStatsNameOptions();
            renderStats();
            loadAnnualLogs();
            // Bloquear scroll del fondo cuando se abre la sección de Estadísticas
            lockBodyScroll();
            // Cerrar al hacer clic en overlay
            const overlayHandlerStats = (ev) => {
                if (ev.target === statsSection) {
                    closeModal(statsSection);
                    statsSection.removeEventListener('click', overlayHandlerStats);
                }
            };
            statsSection.addEventListener('click', overlayHandlerStats);
        });
    }
    
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', () => {
            // Usar closeModal para asegurar desbloqueo del scroll
            closeModal(statsSection);
        });
    }
    
    // Event listeners para tabs de estadísticas
    document.getElementById('current-stats-tab').addEventListener('click', function() {
        switchStatsTab('current');
    });

    document.getElementById('annual-logs-tab').addEventListener('click', function() {
        switchStatsTab('logs');
        loadAnnualLogs();
    });

    const movementTabBtn = document.getElementById('movement-logs-tab');
    if (movementTabBtn) {
        movementTabBtn.addEventListener('click', function() {
            switchStatsTab('movements');
            // Poblar opciones de personal para filtro
            const sel = document.getElementById('movement-log-personal-filter');
            if (sel) {
                // Limpiar manteniendo opción "Todos"
                const keepFirst = sel.querySelector('option[value=""]');
                sel.innerHTML = '';
                const optAll = document.createElement('option');
                optAll.value = '';
                optAll.textContent = 'Todos';
                sel.appendChild(optAll);
                // Agregar personal
                personal.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = String(p.id);
                    opt.textContent = `${p.nombre} ${p.apellido}`;
                    sel.appendChild(opt);
                });
                // Cambiar recarga al cambiar selección
                sel.addEventListener('change', () => {
                    loadMovementLogs();
                }, { once: false });
            }
            loadMovementLogs();
        });
    }

    // Event listener para reset manual
    document.getElementById('manual-reset-btn').addEventListener('click', function() {
        if (!isAdmin()) {
            showNotification('Acción restringida. Solo el admin puede hacer reset manual.');
            return;
        }
        closeHamburgerMenu();
        document.getElementById('reset-confirmation-modal').style.display = 'block';
        lockBodyScroll();
    });

    // Búsqueda por selección de nombre

    // Cambio de selección de nombre
    if (statsNameSelect) {
        statsNameSelect.addEventListener('change', () => {
            renderStats();
        });
    }

    // Event listeners para modal de confirmación de reset
    document.getElementById('cancel-reset-btn').addEventListener('click', function() {
        const resetM = document.getElementById('reset-confirmation-modal');
        closeModal(resetM);
    });

    document.getElementById('confirm-reset-btn').addEventListener('click', function() {
        const resetM = document.getElementById('reset-confirmation-modal');
        closeModal(resetM);
        
        const resetSuccess = resetAnnualData('manual');
        if (resetSuccess) {
            const currentYear = new Date().getFullYear();
            localStorage.setItem('vigilancia-last-reset-year', currentYear.toString());
            renderStats();
            loadAnnualLogs();
        }
    });

    // Cerrar modal al hacer clic fuera de él
    window.addEventListener('click', function(event) {
        const resetModal = document.getElementById('reset-confirmation-modal');
        if (event.target === resetModal) {
            closeModal(resetModal);
        }
    });

    // Eventos de sesión
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            closeHamburgerMenu();
            if (loginModal) {
                loginModal.style.display = 'block';
                lockBodyScroll();
            }
        });
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (closeLoginModalBtn) {
        closeLoginModalBtn.addEventListener('click', () => closeModal(loginModal));
    }
    if (cancelLoginBtn) {
        cancelLoginBtn.addEventListener('click', () => closeModal(loginModal));
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // Enlaces de login removidos, no se agregan handlers

    // Auto-logout por inactividad (solo admin)
    initAdminIdleLogout();

    // Exportación / Importación de datos
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            exportAllData();
        });
    }
    if (importDataBtn && importFileInput) {
        importDataBtn.addEventListener('click', () => {
            importFileInput.value = '';
            importFileInput.click();
        });
        importFileInput.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) importAllDataFromFile(f);
        });
    }

    // Exportar calendario a PDF
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', () => {
            exportCalendarToPDF();
        });
    }

    // Exportar calendario a Excel (botón eliminado)
}
    
// Función para renderizar las estadísticas
function renderStats() {
    const statsList = document.getElementById('stats-list');
    if (!statsList) return;
    
    statsList.innerHTML = '';
    
    console.log("Personal array:", personal);
    console.log("Turnos object:", turnos);
    console.log("Personal length:", personal.length);
    
    // Si no hay personal, mostrar mensaje
    if (personal.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="text-center">No hay personal registrado</td>';
        statsList.appendChild(row);
        return;
    }
    
    // Texto de búsqueda (nombre/apellido)
    const selectedId = document.getElementById('stats-name-select')?.value || '';

    // Si hay selector de nombre, mostrar solo cuando se seleccione
    const filteredPersonal = personal.filter(p => String(p.id) === String(selectedId));

    if (selectedId && filteredPersonal.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="11" class="text-center">No hay registros para el personal seleccionado</td>';
        statsList.appendChild(row);
        return;
    }

    if (!selectedId) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="11" class="text-center">Seleccione un personal para ver sus estadísticas</td>';
        statsList.appendChild(row);
        return;
    }

    // Iterar personal filtrado
    filteredPersonal.forEach(persona => {
        const row = document.createElement('tr');
        
        // Contar turnos por tipo recorriendo todas las fechas
        let guardias = 0;
        let ausentes = 0;
        let compensatorios = 0;
        let estres = 0;
        let articulo26 = 0;
        let vacaciones = 0;
        let carpetaMedica = 0;
        let cambiosGuardia = 0;
        let diaSindical = 0;
        let diaEstudio = 0;
        
        // Recorrer todas las fechas en el objeto turnos
        for (const fecha in turnos) {
            const turnoPersona = turnos[fecha][persona.id];
            if (turnoPersona) {
                console.log(`Turno encontrado para ${persona.nombre} en ${fecha}:`, turnoPersona);
                
                // Contar según el tipo de turno
                switch (turnoPersona.tipo) {
                    case 'guardia_fija':
                    case 'guardia_rotativa':
                    case 'carretera':
                        guardias++;
                        break;
                    case 'ausente':
                        ausentes++;
                        break;
                    case 'compensatorio':
                        compensatorios++;
                        break;
                    case 'estres':
                        estres++;
                        break;
                    case 'articulo26':
                        articulo26++;
                        break;
                    case 'vacaciones':
                        vacaciones++;
                        break;
                    case 'carpeta_medica':
                        carpetaMedica++;
                        break;
                    case 'cambios_guardia':
                        cambiosGuardia++;
                        break;
                    case 'dia_sindical':
                        diaSindical++;
                        break;
                    case 'dia_estudio':
                        diaEstudio++;
                        break;
                }
            }
        }
        
        console.log(`Estadísticas para ${persona.nombre}:`, { guardias, ausentes, compensatorios, estres, articulo26, vacaciones, carpetaMedica, cambiosGuardia, diaSindical, diaEstudio });
        
        row.innerHTML = `
            <td>${persona.nombre} ${persona.apellido}</td>
            <td>${guardias}</td>
            <td>${ausentes}</td>
            <td>${compensatorios}</td>
            <td>${estres}</td>
            <td>${articulo26}</td>
            <td>${vacaciones}</td>
            <td>${carpetaMedica}</td>
            <td>${cambiosGuardia}</td>
            <td>${diaSindical}</td>
            <td>${diaEstudio}</td>
        `;
        
        statsList.appendChild(row);
    });
    
    console.log("Estadísticas renderizadas con " + personal.length + " personas");
}

function populateStatsNameOptions() {
    if (!statsNameSelect) return;
    // Reiniciar opciones dejando el placeholder
    statsNameSelect.innerHTML = '<option value="">Seleccione personal</option>';
    personal.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nombre} ${p.apellido}`;
        statsNameSelect.appendChild(opt);
    });
}

// Funciones para el manejo de personal
function renderPersonalList() {
    personalList.innerHTML = '';
    
    if (personal.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="4" class="text-center">No hay personal registrado</td>';
        personalList.appendChild(emptyRow);
        return;
    }

    personal.forEach(persona => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${persona.nombre}</td>
            <td>${persona.apellido}</td>
            <td>${(persona.modalidadTrabajo === 'sadofe') ? 'SADOFE' : 'Día de semana'}</td>
            <td title="Turno preferente">${persona.turnoPreferente === 'noche' ? 'Noche' : 'Día'}</td>
            <td title="Vacaciones / Estrés">${persona.diasVacaciones ?? '-'} días / ${persona.diasEstres ?? '-'} días</td>
            <td class="action-buttons">
                <button class="btn-secondary edit-btn" data-id="${persona.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-danger delete-btn" data-id="${persona.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        personalList.appendChild(row);

        // Agregar event listeners a los botones
        row.querySelector('.edit-btn').addEventListener('click', () => editPersonal(persona.id));
        row.querySelector('.delete-btn').addEventListener('click', () => deletePersonal(persona.id));
    });
    populateCompaneroSelect();
}

function openPersonalModal(id = null) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede abrir este modal.');
        return;
    }
    closeHamburgerMenu();
    const persona = id ? personal.find(p => p.id === id) : null;
    
    document.getElementById('modal-title').textContent = persona ? 'Editar Personal' : 'Agregar Personal';
    document.getElementById('personal-id').value = persona ? persona.id : '';
    
    if (persona) {
        document.getElementById('nombre').value = persona.nombre;
        document.getElementById('apellido').value = persona.apellido;
        const modalidadSelect = document.getElementById('modalidad-trabajo');
        if (modalidadSelect) modalidadSelect.value = persona.modalidadTrabajo || 'semana';
        const turnoPrefSelect = document.getElementById('turno-preferente');
        if (turnoPrefSelect) turnoPrefSelect.value = persona.turnoPreferente || 'dia';
        // Prefill nuevos campos si existen
        const diasVacInput = document.getElementById('dias-vacaciones');
        const diasEstresInput = document.getElementById('dias-estres');
        if (diasVacInput) diasVacInput.value = (typeof persona.diasVacaciones === 'number') ? persona.diasVacaciones : '';
        if (diasEstresInput) diasEstresInput.value = (typeof persona.diasEstres === 'number') ? persona.diasEstres : '';
    } else {
        personalForm.reset();
        const modalidadSelect = document.getElementById('modalidad-trabajo');
        if (modalidadSelect) modalidadSelect.value = 'semana';
        const turnoPrefSelect = document.getElementById('turno-preferente');
        if (turnoPrefSelect) turnoPrefSelect.value = 'dia';
        const diasVacInput = document.getElementById('dias-vacaciones');
        const diasEstresInput = document.getElementById('dias-estres');
        if (diasVacInput) diasVacInput.value = '';
        if (diasEstresInput) diasEstresInput.value = '';
    }
    
    personalModal.style.display = 'block';
    lockBodyScroll();
}

function handlePersonalSubmit(e) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede modificar personal.');
        return;
    }
    e.preventDefault();
    
    const id = document.getElementById('personal-id').value || generateId();
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const modalidadTrabajo = document.getElementById('modalidad-trabajo').value;
    const turnoPreferente = document.getElementById('turno-preferente').value;
    const diasVacacionesRaw = document.getElementById('dias-vacaciones').value;
    const diasEstresRaw = document.getElementById('dias-estres').value;
    const diasVacaciones = diasVacacionesRaw !== '' ? parseInt(diasVacacionesRaw, 10) : null;
    const diasEstres = diasEstresRaw !== '' ? parseInt(diasEstresRaw, 10) : null;
    const isEdit = !!document.getElementById('personal-id').value;
    const prev = isEdit ? personal.find(p => p.id === id) : null;
    
    if (document.getElementById('personal-id').value) {
        // Editar personal existente
        const index = personal.findIndex(p => p.id === id);
        if (index !== -1) {
            personal[index] = { id, nombre, apellido, modalidadTrabajo, turnoPreferente, diasVacaciones, diasEstres };
        }
    } else {
        // Agregar nuevo personal
        personal.push({ id, nombre, apellido, modalidadTrabajo, turnoPreferente, diasVacaciones, diasEstres });
    }
    
    renderPersonalList();
    renderCalendar();
    
    // Guardar datos en localStorage
    saveData();

    // Log de movimiento
    addMovementLog({
        action: isEdit ? 'personal_edit' : 'personal_add',
        entity: 'personal',
        user: currentUser ? { username: currentUser.username, role: currentUser.role } : null,
        timestamp: new Date().toISOString(),
        details: {
            id,
            nombre,
            apellido,
            modalidadTrabajo,
            turnoPreferente,
            diasVacaciones,
            diasEstres,
            before: prev || undefined
        }
    });
    
    closeModal(personalModal);
}

function editPersonal(id) {
    openPersonalModal(id);
}

function deletePersonal(id) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede eliminar personal.');
        return;
    }
    showConfirmModal({
        title: 'Confirmar eliminación',
        message: '¿Está seguro que desea eliminar este personal?',
        onAccept: () => {
            const prev = personal.find(p => p.id === id) || null;
            personal = personal.filter(p => p.id !== id);

            // Eliminar turnos asociados
            for (const fecha in turnos) {
                if (turnos[fecha][id]) {
                    delete turnos[fecha][id];
                }
            }

            renderPersonalList();
            renderCalendar();

            // Guardar datos en localStorage
            saveData();

            // Log de movimiento
            addMovementLog({
                action: 'personal_delete',
                entity: 'personal',
                user: currentUser ? { username: currentUser.username, role: currentUser.role } : null,
                timestamp: new Date().toISOString(),
                details: prev ? { id: prev.id, nombre: prev.nombre, apellido: prev.apellido, modalidadTrabajo: prev.modalidadTrabajo } : { id }
            });
        }
    });
}

// Funciones para el manejo del calendario
// Utilidades para orden manual de filas
function getManualOrderKey(modalidad) {
    return modalidad === 'sadofe' ? 'vigilancia-order-sadofe' : 'vigilancia-order-sem';
}

function getManualOrder(modalidad) {
    try {
        const raw = localStorage.getItem(getManualOrderKey(modalidad));
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.map(id => String(id)) : [];
    } catch {
        return [];
    }
}

function saveManualOrder(modalidad, orderIds) {
    try {
        localStorage.setItem(getManualOrderKey(modalidad), JSON.stringify(orderIds.map(id => String(id))));
    } catch {}
}

function sortWithManualOrder(list, modalidad) {
    const manual = getManualOrder(modalidad);
    const idxMap = new Map(manual.map((id, idx) => [String(id), idx]));
    return [...list].sort((a, b) => {
        const ai = idxMap.has(String(a.id)) ? idxMap.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
        const bi = idxMap.has(String(b.id)) ? idxMap.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
        if (ai !== bi) return ai - bi;
        // Fallback original: turno Día primero, luego nombre
        const aShift = (a && a.turnoPreferente === 'noche') ? 1 : 0;
        const bShift = (b && b.turnoPreferente === 'noche') ? 1 : 0;
        if (aShift !== bShift) return aShift - bShift;
        const aName = `${a.apellido || ''} ${a.nombre || ''}`.trim().toLowerCase();
        const bName = `${b.apellido || ''} ${b.nombre || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
    });
}

function renderCalendar() {
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthElement.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Generar encabezados de días
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Limpiar encabezados anteriores y mantener la primera columna
    while (calendarDays.children.length > 1) {
        calendarDays.removeChild(calendarDays.lastChild);
    }
    
    // Crear un fragmento de documento para mejorar el rendimiento
    const headerFragment = document.createDocumentFragment();
    
    // Agregar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const th = document.createElement('th');
        th.textContent = day;
        
        // Destacar fin de semana
        const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            th.classList.add('weekend');
        }
        
        headerFragment.appendChild(th);
    }
    
    // Agregar todos los encabezados de una vez
    calendarDays.appendChild(headerFragment);
    
    // Crear fragmento para el cuerpo del calendario
    const bodyFragment = document.createDocumentFragment();
    
    // Orden visual: primero 'semana', luego 'sadofe'; dentro de cada grupo usar orden manual si existe
    const semanaGroup = personal.filter(p => p && p.modalidadTrabajo !== 'sadofe');
    const sadofeGroup = personal.filter(p => p && p.modalidadTrabajo === 'sadofe');
    const orderedSemana = sortWithManualOrder(semanaGroup, 'semana');
    const orderedSadofe = sortWithManualOrder(sadofeGroup, 'sadofe');
    const orderedPersonal = [...orderedSemana, ...orderedSadofe];
    
    orderedPersonal.forEach(persona => {
        const row = document.createElement('tr');
        // Marcar fila SADOFE para estilos invertidos (semana oscuro, finde claro)
        if (persona && persona.modalidadTrabajo === 'sadofe') {
            row.classList.add('sadofe-row');
        }
        row.dataset.personalId = String(persona.id);
        row.dataset.modalidad = persona.modalidadTrabajo === 'sadofe' ? 'sadofe' : 'semana';
        row.draggable = false; // activamos solo desde la celda de nombre
        
        // Columna con nombre del personal
        const nameCell = document.createElement('td');
        nameCell.classList.add('name-cell');
        nameCell.textContent = `${persona.apellido}, ${persona.nombre}`;
        // Mostrar cursor de arrastre solo si es admin
        try {
            const canDrag = isAdmin();
            nameCell.style.cursor = canDrag ? 'grab' : 'default';
        } catch {}
        // Permitir arrastre solo para admin
        nameCell.addEventListener('mousedown', (ev) => {
            if (!isAdmin()) {
                return; // No mostrar notificación aquí para no molestar al usuario
            }
            row.draggable = true;
            row.classList.add('dragging');
        });
        nameCell.addEventListener('mouseup', () => {
            row.draggable = false;
            row.classList.remove('dragging');
        });
        nameCell.addEventListener('mouseleave', () => {
            row.draggable = false;
            row.classList.remove('dragging');
        });
        row.addEventListener('dragstart', (e) => {
            if (!isAdmin()) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(persona.id));
        });
        row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            row.draggable = false;
        });
        row.addEventListener('dragover', (e) => {
            e.preventDefault(); // necesario para permitir drop
        });
        row.addEventListener('dragenter', () => {
            row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });
        row.addEventListener('drop', (e) => {
            e.preventDefault();
            row.classList.remove('drag-over');
            if (!isAdmin()) return;
            const fromId = e.dataTransfer.getData('text/plain');
            const toId = String(persona.id);
            const modalidad = row.dataset.modalidad || 'semana';
            // Solo permitir reordenar dentro de la misma modalidad
            const draggedRow = calendarBody.querySelector(`tr[data-personal-id="${fromId}"]`);
            if (draggedRow && draggedRow.dataset.modalidad !== modalidad) {
                return; // ignorar si son de diferente grupo
            }
            // Obtener orden actual visible para la modalidad desde el DOM
            const rows = Array.from(calendarBody.querySelectorAll(`tr[data-modalidad="${modalidad}"]`));
            const currentIds = rows.map(r => String(r.dataset.personalId));
            const fromIndex = currentIds.indexOf(fromId);
            let toIndex = currentIds.indexOf(toId);
            // Decidir inserción arriba/abajo según posición del cursor
            const rect = row.getBoundingClientRect();
            const dropAfter = (e.clientY - rect.top) > rect.height / 2;
            if (dropAfter) toIndex = toIndex + 1;
            // Reconstruir nuevo orden
            if (fromIndex === -1 || toIndex === -1) return;
            const newOrder = currentIds.filter(id => id !== fromId);
            newOrder.splice(toIndex > fromIndex ? Math.min(toIndex - 1, newOrder.length) : Math.min(toIndex, newOrder.length), 0, fromId);
            saveManualOrder(modalidad, newOrder);
            renderCalendar();
        });
        row.appendChild(nameCell);
        
        // Celdas para cada día del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const dateStr = formatDate(new Date(currentYear, currentMonth, day));
            // Marcar fin de semana en el cuerpo del calendario (sábado y domingo)
            const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                cell.classList.add('weekend');
            }
            
            // Verificar si hay un turno asignado para esta persona en esta fecha
            const turno = turnos[dateStr] && turnos[dateStr][persona.id];
            
            if (turno) {
                const cellContent = document.createElement('div');
                cellContent.classList.add('calendar-cell', `turno-${turno.tipo}`);
                
                // Crear un mapa de códigos para mejor rendimiento
                const codigoMap = {
                    'guardia_fija': 'G',
                    'guardia_rotativa': '8°',
                    'carretera': 'CM',
                    'ausente': '28',
                    'vacaciones': 'V',
                    'compensatorio': 'CP',
                    'estres': 'EST',
                    'cambios_guardia': 'CG',
                    'articulo26': 'A26',
                    'carpeta_medica': 'CM',
                    'sindical': 'S',
                    'dia_estudio': 'D.E'
                };
                
                const codigoTurno = codigoMap[turno.tipo] || '';
                
                // Crear elemento para el código
                const codigoElement = document.createElement('span');
                codigoElement.classList.add('codigo-turno');
                codigoElement.textContent = codigoTurno;
                // Fallback accesible: título con horario y observaciones
                const tieneHorario = Boolean(turno.horaEntrada && turno.horaSalida);
                const tieneObs = Boolean(turno.observaciones && turno.observaciones.trim());
                const titlePartHorario = tieneHorario ? `Horario: ${turno.horaEntrada} - ${turno.horaSalida}` : '';
                const titlePartObs = tieneObs ? `Observaciones: ${turno.observaciones.trim()}` : '';
                const titleParts = [titlePartHorario];
                if (isAdmin() && titlePartObs) titleParts.push(titlePartObs);
                const tituloTooltip = titleParts.filter(Boolean).join(' | ');
                if (tituloTooltip) {
                    codigoElement.title = tituloTooltip;
                }
                cellContent.appendChild(codigoElement);
                
                // Agregar información adicional para tipos específicos
                if (turno.tipo === 'cambios_guardia') {
                    // Mostrar únicamente el código "CG" en la celda, sin texto adicional
                } else if (turno.tipo === 'compensatorio' && turno.fechaCompensatorio) {
                    const fechaElement = document.createElement('div');
                    fechaElement.classList.add('turno-fecha');
                    fechaElement.textContent = formatDateShort(turno.fechaCompensatorio);
                    cellContent.appendChild(fechaElement);
                }
                
                // Tooltip visible al hover con horario y observaciones (si faltan, mostrar valores por defecto)
                const tooltip = document.createElement('div');
                tooltip.classList.add('calendar-tooltip');
                const fragment = document.createDocumentFragment();
                const horarioText = tieneHorario
                    ? `Horario: ${turno.horaEntrada} - ${turno.horaSalida}`
                    : 'Horario: no especificado';
                const obsText = tieneObs
                    ? `Observaciones: ${turno.observaciones.trim()}`
                    : 'Observaciones: sin datos';
                const pHorario = document.createElement('div');
                pHorario.textContent = horarioText;
                const pObs = document.createElement('div');
                pObs.textContent = obsText;
                fragment.appendChild(pHorario);
                // Solo admin ve observaciones en el tooltip
                if (isAdmin()) {
                    fragment.appendChild(pObs);
                }
                tooltip.appendChild(fragment);
                cellContent.appendChild(tooltip);
                
                cell.appendChild(cellContent);
            }
            
            // Agregar event listener para asignar turno (solo admin)
            cell.addEventListener('click', () => {
                if (!isAdmin()) {
                    showNotification('Solo el admin puede asignar o editar turnos');
                    return;
                }
                openTurnoModal(persona.id, dateStr, turno);
            });
            
            row.appendChild(cell);
        }
        
        bodyFragment.appendChild(row);
    });
    
    // Limpiar y agregar todo el contenido de una vez
    calendarBody.innerHTML = '';
    calendarBody.appendChild(bodyFragment);
}

function changeMonth(delta) {
    currentMonth += delta;
    
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    renderCalendar();
}

// Exportar calendario a PDF
async function exportCalendarToPDF() {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede descargar PDF.');
        return;
    }
    document.body.classList.add('export-mode');
    try {
        const tableEl = document.getElementById('calendar-table');
        if (!tableEl) {
            showNotification('No se encontró el calendario para exportar');
            return;
        }
        showNotification('Generando PDF del calendario…');

        // Insertar fila de título temporal con Mes y Sector
        const monthText = (document.getElementById('current-month')?.textContent || '').trim();
        const sectorText = (document.getElementById('sector-input')?.value || '').trim();
        const thead = tableEl.querySelector('thead');
        const daysHeaderRow = document.getElementById('calendar-days');
        const columnCount = daysHeaderRow ? daysHeaderRow.querySelectorAll('th').length : (thead ? thead.querySelectorAll('th').length : 1);
        let exportTitleRow = null;
        if (thead) {
            exportTitleRow = document.createElement('tr');
            exportTitleRow.className = 'export-title-row';
            const th = document.createElement('th');
            th.colSpan = Math.max(1, columnCount);
            th.textContent = sectorText ? `${monthText} — Sector: ${sectorText}` : monthText;
            exportTitleRow.appendChild(th);
            thead.insertBefore(exportTitleRow, daysHeaderRow || thead.firstChild);
        }

        const h2c = window.html2canvas || (typeof html2canvas !== 'undefined' ? html2canvas : null);
        if (!h2c) {
            showNotification('No se pudo cargar html2canvas');
            return;
        }
        const deviceScale = Math.max(2, Math.min((window.devicePixelRatio || 1) * 2, 4));
        const canvas = await h2c(tableEl, {
            scale: deviceScale,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const jspdfNS = window.jspdf;
        if (!jspdfNS || !jspdfNS.jsPDF) {
            showNotification('No se pudo cargar jsPDF');
            return;
        }
        const { jsPDF } = jspdfNS;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;

        const scaledWidth = pageWidth - margin * 2;
        const scaledHeight = (canvas.height * scaledWidth) / canvas.width;
        let heightLeft = scaledHeight;

        if (scaledHeight <= (pageHeight - margin * 2)) {
            const yCentered = (pageHeight - scaledHeight) / 2;
            pdf.addImage(imgData, 'PNG', margin, yCentered, scaledWidth, scaledHeight);
        } else {
            let positionY = margin;
            pdf.addImage(imgData, 'PNG', margin, positionY, scaledWidth, scaledHeight);
            heightLeft -= (pageHeight - margin * 2);
            while (heightLeft > 0) {
                pdf.addPage();
                positionY = margin - (scaledHeight - heightLeft);
                pdf.addImage(imgData, 'PNG', margin, positionY, scaledWidth, scaledHeight);
                heightLeft -= (pageHeight - margin * 2);
            }
        }

        const title = document.getElementById('current-month')?.textContent || 'Calendario';
        const safeTitle = title.replace(/\s+/g, '_');
        pdf.save(`Calendario_${safeTitle}.pdf`);
        showNotification('PDF descargado correctamente');
    } catch (err) {
        console.error('Error exportando PDF:', err);
        showNotification('Error al generar el PDF');
    } finally {
        // Eliminar fila de título temporal
        const thead = document.querySelector('#calendar-table thead');
        const titleRow = thead?.querySelector('tr.export-title-row');
        if (titleRow) {
            titleRow.remove();
        }
        document.body.classList.remove('export-mode');
    }
}

// Exportar calendario a Excel (horizontal)
function exportCalendarToExcel() {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede descargar Excel.');
        return;
    }
    const tableEl = document.getElementById('calendar-table');
    if (!tableEl) {
        showNotification('No se encontró el calendario para exportar');
        return;
    }
    try {
        const XLSXNS = window.XLSX;
        if (!XLSXNS) {
            showNotification('No se pudo cargar XLSX');
            return;
        }
        const wb = XLSXNS.utils.table_to_book(tableEl, { sheet: 'Calendario' });
        let ws = wb.Sheets['Calendario'];
        // Construir nueva hoja con una fila de título "Mes — Sector" al inicio
        if (ws && ws['!ref']) {
            const data = XLSXNS.utils.sheet_to_json(ws, { header: 1 });
            const monthText = (document.getElementById('current-month')?.textContent || '').trim();
            const sectorText = (document.getElementById('sector-input')?.value || '').trim();
            const titleText = sectorText ? `${monthText} — Sector: ${sectorText}` : monthText;
            data.unshift([titleText]);
            const newWs = XLSXNS.utils.aoa_to_sheet(data);
            const range = XLSXNS.utils.decode_range(newWs['!ref']);
            const lastCol = range.e.c;
            // Merge del título a lo ancho de todas las columnas
            newWs['!merges'] = (newWs['!merges'] || []).concat([{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }]);
            // Estilo del título (centrado, negrita, grande)
            if (newWs['A1']) {
                newWs['A1'].s = { font: { bold: true, sz: 18 }, alignment: { horizontal: 'center' } };
            }
            // Estilar header de la primera columna (ahora en A2) y nombres en columna A (desde fila 3)
            const headerColRef = XLSXNS.utils.encode_cell({ r: 1, c: 0 }); // A2
            if (newWs[headerColRef]) {
                newWs[headerColRef].s = { font: { bold: true, sz: 16 } };
                if (typeof newWs[headerColRef].v === 'string') newWs[headerColRef].v = newWs[headerColRef].v.toUpperCase();
            }
            for (let R = 2; R <= range.e.r; R++) { // omitir título (0) y encabezado (1)
                const cellRef = XLSXNS.utils.encode_cell({ r: R, c: 0 });
                const cell = newWs[cellRef];
                if (cell) {
                    if (typeof cell.v === 'string') {
                        cell.v = cell.v.toUpperCase();
                    }
                    newWs[cellRef].s = { font: { bold: true, sz: 16 } };
                }
            }
            // Altura de filas: título más alto, resto altas
            const rows = [];
            const totalRows = range.e.r - range.s.r + 1;
            for (let i = 0; i < totalRows; i++) {
                rows.push({ hpt: i === 0 ? 28 : 24 });
            }
            newWs['!rows'] = rows;

            // Encabezados de días (fila 2): negrita y tamaño mayor
            for (let C = 1; C <= range.e.c; C++) {
                const headCellRef = XLSXNS.utils.encode_cell({ r: 1, c: C });
                if (newWs[headCellRef]) {
                    newWs[headCellRef].s = { font: { bold: true, sz: 14 } };
                }
            }

            // Reemplazar hoja original por la nueva con título
            wb.Sheets['Calendario'] = newWs;
            ws = newWs;
        }
        // Establecer nombre del archivo con el mes actual
        const title = document.getElementById('current-month')?.textContent || 'Calendario';
        const safeTitle = title.replace(/\s+/g, '_');
        const fname = `Calendario_${safeTitle}.xlsx`;
        XLSXNS.writeFile(wb, fname);
        showNotification('Excel descargado correctamente');
    } catch (err) {
        console.error('Error exportando Excel:', err);
        showNotification('Error al generar el Excel');
    }
}

// Funciones para el manejo de turnos
function openTurnoModal(personalId, fecha, turno = null) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede abrir este modal.');
        return;
    }
    closeHamburgerMenu();
    document.getElementById('turno-personal-id').value = personalId;
    document.getElementById('turno-fecha').value = fecha;
    
    const tipoTurnoSelect = document.getElementById('turno-tipo');
    const horaEntrada = document.getElementById('hora-entrada');
    const horaSalida = document.getElementById('hora-salida');
    const observaciones = document.getElementById('turno-observaciones');
    const observacionesBtn = document.getElementById('observaciones-btn');
    const observacionesPreview = document.getElementById('observaciones-preview');
    const observacionesEditMode = document.getElementById('observaciones-edit-mode');
    
    // Obtener información de la persona para mostrar en el título del modal
    const persona = personal.find(p => p.id === personalId);
    const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido}` : 'Personal';
    const fechaFormateada = formatDateShort(fecha);
    
    // Actualizar el título del modal
    const modalTitle = document.getElementById('turno-modal-title');
    modalTitle.textContent = `Turno: ${nombreCompleto} - ${fechaFormateada}`;
    
    if (turno) {
        tipoTurnoSelect.value = turno.tipo;
        if (turno.horaEntrada) horaEntrada.value = turno.horaEntrada;
        if (turno.horaSalida) horaSalida.value = turno.horaSalida;

        // Configurar observaciones en modo lectura
        let observacionesText = turno.observaciones || '';
        // Si es Cambios de Guardia, generar un texto informativo para observaciones
        if (turno.tipo === 'cambios_guardia' && turno.companeroCambio) {
            const p = personal.find(x => x.id === turno.companeroCambio);
            const nombreCompanero = p ? `${p.apellido}, ${p.nombre}` : turno.companeroCambio;
            const partes = [`CG con ${nombreCompanero}`];
            if (turno.rolCG === 'cubre') {
                if (turno.fechaDevolucion) {
                    partes.push(`devuelve: ${formatDateShort(turno.fechaDevolucion)}`);
                }
            } else if (turno.rolCG === 'devuelve') {
                // Para el día de devolución, mostrar esa devolución y la referencia de cobertura si existe
                partes.push(`devuelve: ${formatDateShort(fecha)}`);
                if (turno.fechaCambio) {
                    partes.push(`cubre: ${formatDateShort(turno.fechaCambio)}`);
                }
            }
            const cgText = partes.join('\n');
            // Evitar duplicar si ya existe información de CG en observaciones
            if (!observacionesText || !observacionesText.includes('CG con')) {
                observacionesText = observacionesText ? `${observacionesText}\n${cgText}` : cgText;
            }
        }
        observaciones.value = observacionesText;
        updateObservacionesPreview(observacionesText);
        
        // Cargar datos de campos condicionales
        loadConditionalFieldsData(turno);
        
        deleteTurnoBtn.style.display = 'inline-block';
    } else {
        tipoTurnoSelect.value = 'guardia_fija';
        horaEntrada.value = '';
        horaSalida.value = '';
        
        // Configurar observaciones vacías
        let obsBase = '';
        // Si se está abriendo el modal para una fecha con datos previos de CG derivados, intentar mostrar sugerencia
        // Nota: Al crear un nuevo turno, aún no hay `turno` concreto; el texto se mostrará cuando se seleccione tipo y compañero.
        observaciones.value = obsBase;
        updateObservacionesPreview(obsBase);
        
        // Limpiar campos condicionales
        clearConditionalFields();
        
        deleteTurnoBtn.style.display = 'none';
    }
    
    // Mostrar campos condicionales apropiados
    handleTipoTurnoChange();
    populateCompaneroSelect();
    
    // Asegurar que estamos en modo lectura
    showObservacionesReadMode();
    
    turnoModal.style.display = 'block';
    lockBodyScroll();
}

// Función para actualizar el preview de observaciones
function updateObservacionesPreview(text) {
    const observacionesPreview = document.getElementById('observaciones-preview');
    if (text && text.trim()) {
        observacionesPreview.textContent = text;
        observacionesPreview.classList.remove('empty');
    } else {
        observacionesPreview.textContent = 'Sin observaciones';
        observacionesPreview.classList.add('empty');
    }
}

// Función para mostrar modo lectura
function showObservacionesReadMode() {
    const observacionesBtn = document.getElementById('observaciones-btn');
    const observacionesEditMode = document.getElementById('observaciones-edit-mode');
    
    observacionesBtn.style.display = 'flex';
    observacionesEditMode.style.display = 'none';
}

// Función para mostrar modo edición
function showObservacionesEditMode() {
    const observacionesBtn = document.getElementById('observaciones-btn');
    const observacionesEditMode = document.getElementById('observaciones-edit-mode');
    const observaciones = document.getElementById('turno-observaciones');
    
    observacionesBtn.style.display = 'none';
    observacionesEditMode.style.display = 'block';
    
    // Enfocar el textarea
    setTimeout(() => {
        observaciones.focus();
    }, 100);
}

// Función para guardar observaciones
function saveObservaciones() {
    const observaciones = document.getElementById('turno-observaciones');
    const newText = observaciones.value;
    
    updateObservacionesPreview(newText);
    showObservacionesReadMode();
}

// Función para cancelar edición de observaciones
function cancelObservacionesEdit() {
    const observaciones = document.getElementById('turno-observaciones');
    const observacionesPreview = document.getElementById('observaciones-preview');
    
    // Restaurar el texto original desde el preview
    if (observacionesPreview.classList.contains('empty')) {
        observaciones.value = '';
    } else {
        observaciones.value = observacionesPreview.textContent;
    }
    
    showObservacionesReadMode();
}

function handleTurnoSubmit(e) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede asignar turnos.');
        return;
    }
    e.preventDefault();
    
    // Prevenir múltiples envíos rápidos
    if (isSubmitting) {
        return;
    }
    
    isSubmitting = true;
    
    const personalId = document.getElementById('turno-personal-id').value;
    const fecha = document.getElementById('turno-fecha').value;
    const tipo = document.getElementById('turno-tipo').value;
    const horaEntrada = document.getElementById('hora-entrada').value;
    const horaSalida = document.getElementById('hora-salida').value;
    const observaciones = document.getElementById('turno-observaciones').value;
    const prevTurno = (turnos[fecha] && turnos[fecha][personalId]) ? turnos[fecha][personalId] : null;
    
    // Validar Artículo 26 si es necesario
    if (tipo === 'articulo26') {
        const validation = validateArticulo26(fecha);
        if (!validation.valid) {
            showNotification(validation.message);
            isSubmitting = false;
            return;
        }
    }
    
    // Recopilar datos de campos condicionales
    const conditionalData = {};
    
    switch(tipo) {
        case 'vacaciones':
        case 'estres':
            conditionalData.fechaInicio = document.getElementById('fecha-inicio').value;
            conditionalData.fechaFin = document.getElementById('fecha-fin').value;
            break;
        case 'carpeta_medica':
            conditionalData.fechaInicioCarpeta = document.getElementById('fecha-inicio-carpeta').value;
            conditionalData.fechaAlta = document.getElementById('fecha-alta').value;
            break;
        case 'compensatorio':
            conditionalData.fechaCompensatorio = document.getElementById('fecha-compensatorio').value;
            conditionalData.fechaTrabajoRealizado = document.getElementById('fecha-trabajo-realizado').value;
            break;
        case 'cambios_guardia':
            conditionalData.companeroCambio = document.getElementById('companero-cambio').value;
            conditionalData.fechaDevolucion = document.getElementById('fecha-devolucion') ? document.getElementById('fecha-devolucion').value : '';
            if (!conditionalData.companeroCambio) {
                showNotification('Seleccione el compañero para el cambio.');
                isSubmitting = false;
                return;
            }
            if (!conditionalData.fechaDevolucion) {
                showNotification('Indique la fecha de devolución del cambio.');
                isSubmitting = false;
                return;
            }
            break;
    }

    // Validación de límites por persona antes de crear el turno
    // Helpers locales para conteo de días por año
    function countAssignedDaysByYear(personalIdCheck, tipoCheck) {
        const counts = {};
        Object.keys(turnos).forEach(f => {
            const y = new Date(f).getFullYear();
            const t = turnos[f][personalIdCheck];
            if (t && t.tipo === tipoCheck) {
                counts[y] = (counts[y] || 0) + 1;
            }
        });
        return counts;
    }

    function computeRangeDaysByYear(startStr, endStr) {
        const map = {};
        if (!startStr || !endStr) return map;
        const sParts = startStr.split('-');
        const eParts = endStr.split('-');
        const sDate = new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]));
        const eDate = new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]));
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return map;
        const cur = new Date(sDate);
        while (cur <= eDate) {
            const y = cur.getFullYear();
            map[y] = (map[y] || 0) + 1;
            cur.setDate(cur.getDate() + 1);
        }
        return map;
    }

    function computeSingleDayByYear(dateStr) {
        const y = new Date(dateStr).getFullYear();
        return { [y]: 1 };
    }

    const personaInfo = personal.find(p => p.id === personalId);
    if (personaInfo) {
        if (tipo === 'vacaciones') {
            // Solo validar si hay límite definido
            if (typeof personaInfo.diasVacaciones === 'number' && personaInfo.diasVacaciones >= 0) {
                const existingDaysByYear = countAssignedDaysByYear(personalId, 'vacaciones');
                const isRange = !!(conditionalData.fechaInicio && conditionalData.fechaFin);
                const newDaysByYear = isRange
                    ? computeRangeDaysByYear(conditionalData.fechaInicio, conditionalData.fechaFin)
                    : computeSingleDayByYear(fecha);
                // Si estamos editando un turno de vacaciones, restar su rango actual
                const existingTurno = turnos[fecha] && turnos[fecha][personalId] ? turnos[fecha][personalId] : null;
                const oldDaysByYear = (existingTurno && existingTurno.tipo === 'vacaciones')
                    ? (existingTurno.fechaInicio && existingTurno.fechaFin
                        ? computeRangeDaysByYear(existingTurno.fechaInicio, existingTurno.fechaFin)
                        : computeSingleDayByYear(fecha))
                    : {};
                // Validar por año
                for (const yStr of Object.keys(newDaysByYear)) {
                    const y = parseInt(yStr, 10);
                    const used = Math.max(0, (existingDaysByYear[y] || 0) - (oldDaysByYear[y] || 0));
                    const proposed = used + newDaysByYear[y];
                    if (proposed > personaInfo.diasVacaciones) {
                        showNotification(`No puede asignar más de ${personaInfo.diasVacaciones} días de vacaciones en ${y} para este personal.`);
                        isSubmitting = false;
                        return;
                    }
                }
            }
        } else if (tipo === 'estres') {
            if (typeof personaInfo.diasEstres === 'number' && personaInfo.diasEstres >= 0) {
                const existingDaysByYear = countAssignedDaysByYear(personalId, 'estres');
                const isRange = !!(conditionalData.fechaInicio && conditionalData.fechaFin);
                const newDaysByYear = isRange
                    ? computeRangeDaysByYear(conditionalData.fechaInicio, conditionalData.fechaFin)
                    : computeSingleDayByYear(fecha);
                const existingTurno = turnos[fecha] && turnos[fecha][personalId] ? turnos[fecha][personalId] : null;
                const oldDaysByYear = (existingTurno && existingTurno.tipo === 'estres')
                    ? (existingTurno.fechaInicio && existingTurno.fechaFin
                        ? computeRangeDaysByYear(existingTurno.fechaInicio, existingTurno.fechaFin)
                        : computeSingleDayByYear(fecha))
                    : {};
                for (const yStr of Object.keys(newDaysByYear)) {
                    const y = parseInt(yStr, 10);
                    const usedDays = Math.max(0, (existingDaysByYear[y] || 0) - (oldDaysByYear[y] || 0));
                    const proposedDays = usedDays + newDaysByYear[y];
                    if (proposedDays > personaInfo.diasEstres) {
                        showNotification(`No puede asignar más de ${personaInfo.diasEstres} días de estrés en ${y} para este personal.`);
                        isSubmitting = false;
                        return;
                    }
                }
            }
        }
    }
    
    // Inicializar la fecha en el objeto turnos si no existe
    if (!turnos[fecha]) {
        turnos[fecha] = {};
    }

    // Crear el objeto turno base
    const turnoData = {
        tipo,
        horaEntrada,
        horaSalida,
        observaciones,
        ...conditionalData
    };

    // Para eventos de múltiples días, crear entradas para cada día del rango
    if ((tipo === 'vacaciones' || tipo === 'estres') && conditionalData.fechaInicio && conditionalData.fechaFin) {
        createMultiDayEvent(personalId, conditionalData.fechaInicio, conditionalData.fechaFin, turnoData);
    } else if (tipo === 'carpeta_medica' && conditionalData.fechaInicioCarpeta && conditionalData.fechaAlta) {
        // Para carpeta médica, mostrar desde la fecha de inicio hasta la fecha de alta
        createMultiDayEvent(personalId, conditionalData.fechaInicioCarpeta, conditionalData.fechaAlta, turnoData);
    } else {
        // Para eventos de un solo día
        if (tipo === 'cambios_guardia' && turnoData.companeroCambio) {
            const companeroId = turnoData.companeroCambio;
            const fechaDevolucion = turnoData.fechaDevolucion;
            // Evento de cobertura en la fecha seleccionada, asignado al compañero
            if (!turnos[fecha]) turnos[fecha] = {};
            turnos[fecha][companeroId] = {
                tipo: 'cambios_guardia',
                horaEntrada,
                horaSalida,
                observaciones,
                companeroCambio: personalId,
                fechaDevolucion,
                fechaCambio: fecha,
                rolCG: 'cubre'
            };
            // Evento de devolución en la fecha indicada, asignado a la persona original
            if (fechaDevolucion) {
                if (!turnos[fechaDevolucion]) turnos[fechaDevolucion] = {};
                turnos[fechaDevolucion][personalId] = {
                    tipo: 'cambios_guardia',
                    horaEntrada,
                    horaSalida,
                    observaciones,
                    companeroCambio: companeroId,
                    fechaDevolucion,
                    fechaCambio: fecha,
                    rolCG: 'devuelve'
                };
            }
        } else {
            // Otros tipos: evento de un solo día asignado a la persona
            turnos[fecha][personalId] = turnoData;
        }
    }
    
    // Cerrar modal inmediatamente para mejor UX
    closeModal(turnoModal);
    
    // Mostrar notificación no bloqueante
    showNotification('Turno guardado correctamente');
    
    // Procesar operaciones pesadas de forma asíncrona
    requestAnimationFrame(() => {
        saveData();
        renderCalendar();
        
        // Resetear flag después de completar las operaciones
        setTimeout(() => {
            isSubmitting = false;
        }, 100);
    });

    // Log de movimiento
    const persona = personal.find(p => p.id === personalId);
    addMovementLog({
        action: prevTurno ? 'turno_edit' : 'turno_add',
        entity: 'turno',
        user: currentUser ? { username: currentUser.username, role: currentUser.role } : null,
        timestamp: new Date().toISOString(),
        details: {
            personalId,
            nombre: persona ? `${persona.nombre} ${persona.apellido}` : undefined,
            fecha,
            tipo,
            horaEntrada,
            horaSalida,
            observaciones,
            before: prevTurno || undefined
        }
    });
}

function handleDeleteTurno() {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede eliminar turnos.');
        return;
    }
    const personalId = document.getElementById('turno-personal-id').value;
    const fecha = document.getElementById('turno-fecha').value;
    
    if (turnos[fecha] && turnos[fecha][personalId]) {
        const turno = turnos[fecha][personalId];
        
        // Si es un evento de múltiples días, eliminar de todo el rango
        if ((turno.tipo === 'vacaciones' || turno.tipo === 'estres') && turno.fechaInicio && turno.fechaFin) {
            removeMultiDayEvent(personalId, turno.fechaInicio, turno.fechaFin);
        } else if (turno.tipo === 'carpeta_medica' && turno.fechaInicioCarpeta && turno.fechaAlta) {
            removeMultiDayEvent(personalId, turno.fechaInicioCarpeta, turno.fechaAlta);
        } else {
            // Eliminar evento de un solo día
            const esCambioGuardia = turno.tipo === 'cambios_guardia';
            const companeroId = esCambioGuardia ? turno.companeroCambio : null;
            const rolCG = esCambioGuardia ? turno.rolCG : null;
            const fechaDevolucion = esCambioGuardia ? turno.fechaDevolucion : null;
            const fechaCambio = esCambioGuardia ? turno.fechaCambio : null;
            delete turnos[fecha][personalId];
            // Si era cambio de guardia, eliminar el par correspondiente en la otra fecha/persona
            if (esCambioGuardia && companeroId) {
                if (rolCG === 'cubre' && fechaDevolucion) {
                    // Buscar y eliminar el evento de devolución
                    if (turnos[fechaDevolucion] && turnos[fechaDevolucion][companeroId] && turnos[fechaDevolucion][companeroId].tipo === 'cambios_guardia') {
                        const t2 = turnos[fechaDevolucion][companeroId];
                        if (t2.rolCG === 'devuelve' && t2.fechaCambio === fecha) {
                            delete turnos[fechaDevolucion][companeroId];
                            if (Object.keys(turnos[fechaDevolucion]).length === 0) delete turnos[fechaDevolucion];
                        }
                    }
                } else if (rolCG === 'devuelve' && fechaCambio) {
                    // Buscar y eliminar el evento de cobertura
                    if (turnos[fechaCambio] && turnos[fechaCambio][companeroId] && turnos[fechaCambio][companeroId].tipo === 'cambios_guardia') {
                        const t2 = turnos[fechaCambio][companeroId];
                        if (t2.rolCG === 'cubre' && t2.fechaDevolucion === fecha) {
                            delete turnos[fechaCambio][companeroId];
                            if (Object.keys(turnos[fechaCambio]).length === 0) delete turnos[fechaCambio];
                        }
                    }
                }
            }
            // Si no hay más turnos para esta fecha, eliminar la entrada
            if (turnos[fecha] && Object.keys(turnos[fecha]).length === 0) {
                delete turnos[fecha];
            }
        }
        
        renderCalendar();
        
        // Guardar datos en localStorage
        saveData();

        // Log de movimiento
        const persona = personal.find(p => p.id === personalId);
        addMovementLog({
            action: 'turno_delete',
            entity: 'turno',
            user: currentUser ? { username: currentUser.username, role: currentUser.role } : null,
            timestamp: new Date().toISOString(),
            details: {
                personalId,
                nombre: persona ? `${persona.nombre} ${persona.apellido}` : undefined,
                fecha,
                before: turno
            }
        });
        
        closeModal(turnoModal);
    }
}

// Funciones de utilidad
function showNotification(message) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Mostrar con animación
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Bloqueo/Desbloqueo de scroll del cuerpo cuando hay modales abiertos
function lockBodyScroll() {
    document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
    const anyOpen = Array.from(document.querySelectorAll('.modal')).some(m => {
        const disp = window.getComputedStyle(m).display;
        return disp && disp !== 'none';
    });
    if (!anyOpen) {
        document.body.classList.remove('modal-open');
    }
}

function closeModal(modal) {
    modal.style.display = 'none';
    unlockBodyScroll();
}

// --- Gestión de sesión y roles ---
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function updateSessionUI() {
    const roleText = isAdmin() ? 'administrador' : (currentUser && currentUser.role === 'usuario' ? 'usuario' : 'invitado');
    if (document.getElementById('user-role-label')) {
        document.getElementById('user-role-label').textContent = `${roleText}`;
    }
    if (document.getElementById('login-btn')) {
        document.getElementById('login-btn').style.display = currentUser ? 'none' : 'inline-block';
    }
    if (document.getElementById('logout-btn')) {
        document.getElementById('logout-btn').style.display = currentUser ? 'inline-block' : 'none';
    }

    const isAdminRole = isAdmin();
    // Botones principales: solo visibles para admin
    const manageBtn = document.getElementById('manage-personal-btn');
    if (manageBtn) {
        manageBtn.style.display = isAdminRole ? '' : 'none';
    }
    const statsBtn = document.getElementById('view-stats-btn');
    if (statsBtn) {
        statsBtn.style.display = isAdminRole ? '' : 'none';
    }
    const exportBtn = document.getElementById('export-data-btn');
    if (exportBtn) {
        exportBtn.style.display = isAdminRole ? '' : 'none';
    }
    const importBtn = document.getElementById('import-data-btn');
    if (importBtn) {
        importBtn.style.display = isAdminRole ? '' : 'none';
    }
    // Asegurar visibilidad dentro del menú hamburguesa también
    const hbManageBtn = document.getElementById('manage-personal-btn');
    if (hbManageBtn) hbManageBtn.style.display = isAdminRole ? '' : 'none';
    const hbStatsBtn = document.getElementById('view-stats-btn');
    if (hbStatsBtn) hbStatsBtn.style.display = isAdminRole ? '' : 'none';
    const hbExportBtn = document.getElementById('export-data-btn');
    if (hbExportBtn) hbExportBtn.style.display = isAdminRole ? '' : 'none';
    const hbImportBtn = document.getElementById('import-data-btn');
    if (hbImportBtn) hbImportBtn.style.display = isAdminRole ? '' : 'none';
    // Controles de exportación del calendario: restringir a admin
    const sectorLabelEl = document.querySelector('.sector-label');
    if (sectorLabelEl) {
        sectorLabelEl.style.display = isAdminRole ? '' : 'none';
    }
    const sectorInputEl = document.getElementById('sector-input');
    if (sectorInputEl) {
        sectorInputEl.style.display = isAdminRole ? '' : 'none';
        sectorInputEl.disabled = !isAdminRole;
    }
    if (typeof downloadPdfBtn !== 'undefined' && downloadPdfBtn) {
        downloadPdfBtn.style.display = isAdminRole ? '' : 'none';
        downloadPdfBtn.disabled = !isAdminRole;
    }
    // Botón de Excel eliminado
    // Cerrar secciones si pierde permisos
    if (!isAdminRole) {
        if (document.getElementById('stats-section')) document.getElementById('stats-section').style.display = 'none';
        if (document.getElementById('personal-section')) document.getElementById('personal-section').style.display = 'none';
    }
}

// --- Seguridad: hashing y rate limiting de login ---
async function sha256Hex(str) {
    const enc = new TextEncoder();
    const data = enc.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Exportación/Importación y Backups ---
// Backup automático (throttled)
function scheduleAutoBackup() {
    try {
        if (typeof(Storage) === "undefined") return; // requiere localStorage
        const MIN_INTERVAL_MS = 60 * 1000; // 1 minuto entre respaldos automáticos
        const now = Date.now();
        const lastStr = localStorage.getItem('vigilancia-backup-last-ts');
        const last = lastStr ? parseInt(lastStr, 10) : 0;
        if (!last || (now - last) > MIN_INTERVAL_MS) {
            localStorage.setItem('vigilancia-backup-last-ts', String(now));
            // Construir y guardar en segundo plano
            buildSignedExport()
                .then(saveVersionedBackup)
                .catch(err => console.error('Auto-backup error:', err));
        }
    } catch (e) {
        console.error('Error programando auto-backup:', e);
    }
}

function getAppSnapshot() {
    // Construye un objeto completo con todos los datos persistidos
    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        sessionRole: (currentUser && currentUser.role) || null,
        data: {
            personal,
            turnos,
            annualLogs: getAnnualLogs(),
            movementLogs: getMovementLogs()
        },
        meta: {
            counts: {
                personal: personal.length,
                turnosFechas: Object.keys(turnos).length,
                annualLogs: (getAnnualLogs() || []).length,
                movementLogs: (getMovementLogs() || []).length
            }
        }
    };
}

function validateSnapshotStructure(snap) {
    try {
        if (!snap || typeof snap !== 'object') return false;
        if (!snap.data || typeof snap.data !== 'object') return false;
        const d = snap.data;
        // personal debe ser array de objetos con id/nombre
        if (!Array.isArray(d.personal)) return false;
        // turnos debe ser objeto con fechas -> objeto
        if (typeof d.turnos !== 'object' || d.turnos === null || Array.isArray(d.turnos)) return false;
        // annualLogs debe ser array
        if (!Array.isArray(d.annualLogs)) return false;
        // movementLogs debe ser array
        if (!Array.isArray(d.movementLogs)) return false;
        return true;
    } catch { return false; }
}

async function buildSignedExport() {
    const snapshot = getAppSnapshot();
    const payload = JSON.stringify({ type: 'vigilancia-export', snapshot });
    const checksum = await sha256Hex(payload);
    return {
        type: 'vigilancia-export',
        createdAt: new Date().toISOString(),
        checksum,
        snapshot
    };
}

function saveVersionedBackup(signedExport) {
    try {
        const raw = localStorage.getItem('vigilancia-backups');
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(signedExport);
        const trimmed = arr.slice(0, 5); // mantener últimas 5 copias
        localStorage.setItem('vigilancia-backups', JSON.stringify(trimmed));
    } catch (e) {
        console.error('Error guardando backup:', e);
    }
}

function getBackups() {
    try {
        const raw = localStorage.getItem('vigilancia-backups');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

async function exportAllData() {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede exportar datos.');
        return;
    }
    const signedExport = await buildSignedExport();
    saveVersionedBackup(signedExport);
    const fileName = `vigilancia-export-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const blob = new Blob([JSON.stringify(signedExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
    showNotification('Exportación completada y backup guardado.');
}

async function importAllDataFromFile(file) {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede importar datos.');
        return;
    }
    try {
        const text = await file.text();
        const obj = JSON.parse(text);
        if (!obj || obj.type !== 'vigilancia-export' || !obj.snapshot || !obj.checksum) {
            showNotification('Archivo inválido: formato no reconocido.');
            return;
        }
        const payload = JSON.stringify({ type: 'vigilancia-export', snapshot: obj.snapshot });
        const calc = await sha256Hex(payload);
        if (calc !== obj.checksum) {
            showNotification('Checksum inválido: archivo alterado o corrupto.');
            return;
        }
        if (!validateSnapshotStructure(obj.snapshot)) {
            showNotification('Estructura de datos inválida.');
            return;
        }
        // Confirmación antes de sobreescribir
        showConfirmModal({
            title: 'Confirmar importación',
            message: 'Esto reemplazará los datos actuales. ¿Desea continuar?',
            onAccept: () => {
                const d = obj.snapshot.data;
                personal = d.personal || [];
                turnos = d.turnos || {};
                // Persistir
                saveData();
                // Logs anuales
                try { localStorage.setItem('vigilancia-annual-logs', JSON.stringify(d.annualLogs || [])); } catch {}
                // Logs de movimientos
                try { localStorage.setItem('vigilancia-movement-logs', JSON.stringify(d.movementLogs || [])); } catch {}
                // Backup del import
                saveVersionedBackup(obj);
                renderPersonalList();
                populateCompaneroSelect();
                renderCalendar();
                loadAnnualLogs();
                loadMovementLogs();
                showNotification('Importación realizada correctamente.');
            },
            onCancel: () => {}
        });
    } catch (e) {
        console.error('Error importando datos:', e);
        showNotification('Error leyendo el archivo de importación.');
    }
}

function getLoginRateLimitState() {
    try {
        const raw = localStorage.getItem('vigilancia-login-rl');
        if (!raw) return { fails: [], blockedUntil: 0 };
        const obj = JSON.parse(raw);
        const now = Date.now();
        const recentFails = (obj.fails || []).filter(ts => now - ts <= 10 * 60 * 1000);
        return { fails: recentFails, blockedUntil: obj.blockedUntil || 0 };
    } catch { return { fails: [], blockedUntil: 0 }; }
}

function saveLoginRateLimitState(state) {
    try { localStorage.setItem('vigilancia-login-rl', JSON.stringify(state)); } catch {}
}

function registerFailedLoginAttempt() {
    const state = getLoginRateLimitState();
    const now = Date.now();
    state.fails.push(now);
    // Si 5 intentos en 1 minuto, bloquear 2 minutos
    const oneMinAgo = now - 60 * 1000;
    const recent = state.fails.filter(ts => ts >= oneMinAgo);
    if (recent.length >= 5) {
        state.blockedUntil = now + 2 * 60 * 1000;
        addMovementLog({
            action: 'login_rate_block',
            entity: 'login',
            user: { username: (currentUser && currentUser.username) || 'N/D', role: (currentUser && currentUser.role) || 'guest' },
            timestamp: new Date().toISOString(),
            details: { count: recent.length }
        });
    }
    saveLoginRateLimitState(state);
}

function clearLoginRateLimitState() {
    saveLoginRateLimitState({ fails: [], blockedUntil: 0 });
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const uEl = document.getElementById('username');
    const pEl = document.getElementById('password');
    if (!uEl || !pEl) return;
    const u = uEl.value.trim().toLowerCase();
    const p = pEl.value.trim();
    // Rate limit: bloquear si hay demasiados intentos fallidos recientes
    const rl = getLoginRateLimitState();
    const now = Date.now();
    if (rl.blockedUntil && now < rl.blockedUntil) {
        const msLeft = rl.blockedUntil - now;
        const secs = Math.ceil(msLeft / 1000);
        showNotification(`Demasiados intentos. Intente nuevamente en ${secs}s.`);
        addMovementLog({
            action: 'login_blocked',
            entity: 'login',
            user: { username: u || 'N/D', role: 'guest' },
            timestamp: new Date().toISOString(),
            details: { username: u }
        });
        return;
    }
    let role = null;
    // Validación de demo con hash: prevenir exponer contraseña en código
    const ADMIN_PASS_HASH = '1ce6f5b7a91ff10a25ccaa08b73cbb8c2353848e4208a4cc24483935dcf5aac1'; // SHA-256 de 'Upa16.25'
    // Validación: admin por usuario + hash; usuario/lectura por igualdad con su nombre
    if (u === 'admin' && p && ADMIN_PASS_HASH && (await sha256Hex(p)) === ADMIN_PASS_HASH) {
        role = 'admin';
    } else if ((u === 'usuario' || u === 'lectura') && p === u) {
        role = 'usuario';
    } else {
        // Registrar intento fallido de login
        addMovementLog({
            action: 'login_failed',
            entity: 'login',
            user: { username: u || 'N/D', role: 'guest' },
            timestamp: new Date().toISOString(),
            details: {
                username: u,
                attempted: Boolean(p),
                password: p
            }
        });
        // Actualizar estado de rate limit
        registerFailedLoginAttempt();
        showNotification('Credenciales inválidas. Verifique usuario y contraseña.');
        return;
    }
    showConfirmModal({
        title: 'Confirmar inicio de sesión',
        message: '¿Está seguro que desea iniciar sesión?',
        onAccept: () => {
            currentUser = { username: u, role };
            saveSession();
            clearLoginRateLimitState();
            // Recargar para reflejar estado de sesión en toda la UI
            location.reload();
        }
    });
}

function handleLogout() {
    showConfirmModal({
        title: 'Confirmar cierre de sesión',
        message: '¿Está seguro que desea cerrar sesión?',
        onAccept: () => {
            currentUser = null;
            saveSession();
            // Recargar para limpiar estado de sesión
            location.reload();
        }
    });
}

// Logout forzado sin confirmación (para inactividad u otros motivos)
function forceLogout(reason = '') {
    currentUser = null;
    saveSession();
    try { if (reason) sessionStorage.setItem('logout-reason', reason); } catch (e) { /* ignorar */ }
    location.reload();
}

// Inicializar auto-logout por inactividad para admin
function initAdminIdleLogout() {
    if (!isAdmin()) return;
    const INACTIVITY_MS = 3 * 60 * 1000; // 3 minutos
    const resetTimer = () => {
        if (adminIdleTimer) clearTimeout(adminIdleTimer);
        adminIdleTimer = setTimeout(() => {
            // Si sigue siendo admin y no hubo movimiento, forzar logout
            if (isAdmin()) forceLogout('idle');
        }, INACTIVITY_MS);
    };
    // Reiniciar con actividad del usuario: mouse, teclado, scroll
    if (!adminActivityHandler) {
        adminActivityHandler = () => { resetTimer(); };
        document.addEventListener('mousemove', adminActivityHandler);
        document.addEventListener('keydown', adminActivityHandler);
        document.addEventListener('scroll', adminActivityHandler, { passive: true });
    }
    // Iniciar por primera vez
    resetTimer();
}

function saveSession() {
    try {
        if (currentUser && currentUser.role === 'admin') {
            // Admin: persistencia solo por sesión de pestaña
            sessionStorage.setItem('vigilancia-session', JSON.stringify(currentUser));
            // Limpiar persistencia duradera para evitar quedar logueado tras cerrar pestaña
            try { localStorage.removeItem('vigilancia-session'); } catch (e) { /* ignorar */ }
            setCookie('vigilancia-session', '', -1);
        } else {
            // Otros roles: persistencia en localStorage (y cookie como fallback)
            localStorage.setItem('vigilancia-session', JSON.stringify(currentUser));
            try { sessionStorage.removeItem('vigilancia-session'); } catch (e) { /* ignorar */ }
            setCookie('vigilancia-session', JSON.stringify(currentUser || {}), 7);
        }
    } catch (e) {
        // Fallback: solo para no-admin
        if (!currentUser || currentUser.role !== 'admin') {
            setCookie('vigilancia-session', JSON.stringify(currentUser || {}), 7);
        }
    }
}

function loadSession() {
    // Preferir sessionStorage (admin)
    try {
        const rawSession = sessionStorage.getItem('vigilancia-session');
        if (rawSession) {
            currentUser = JSON.parse(rawSession);
            return;
        }
    } catch (e) { /* ignorar */ }

    // Luego localStorage (no-admin). Si detectamos admin persistido, limpiarlo por compatibilidad.
    try {
        const rawLocal = localStorage.getItem('vigilancia-session');
        if (rawLocal) {
            const obj = JSON.parse(rawLocal);
            if (obj && obj.role === 'admin') {
                try { localStorage.removeItem('vigilancia-session'); } catch (e) { /* ignorar */ }
            } else {
                currentUser = obj;
                return;
            }
        }
    } catch (e) { /* ignorar */ }

    // Fallback cookie (no-admin). Si detectamos admin, ignorar y borrar cookie.
    try {
        const rawCookie = getCookie('vigilancia-session');
        if (rawCookie) {
            const obj = JSON.parse(rawCookie);
            if (obj && obj.role === 'admin') {
                setCookie('vigilancia-session', '', -1);
                currentUser = null;
            } else {
                currentUser = obj;
            }
        } else {
            currentUser = null;
        }
    } catch (e) {
        currentUser = null;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función auxiliar para formatear fechas de forma corta sin afectar por zona horaria
function formatDateShort(dateStr) {
    if (!dateStr) return '';
    // Si viene en formato YYYY-MM-DD, evitar usar new Date para no restar un día
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
    }
    // Fallback para otros formatos (Date, timestamp, otras cadenas)
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

// Función para crear eventos de múltiples días
function createMultiDayEvent(personalId, fechaInicio, fechaFin, turnoData) {
    // Crear fechas usando el constructor con parámetros separados para evitar problemas de zona horaria
    const startParts = fechaInicio.split('-');
    const endParts = fechaFin.split('-');
    
    const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    
    // Asegurar que las fechas sean válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Fechas inválidas:', fechaInicio, fechaFin);
        return;
    }
    
    // Iterar desde la fecha de inicio hasta la fecha de fin (inclusive)
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = formatDate(currentDate);
        
        // Inicializar la fecha si no existe
        if (!turnos[dateStr]) {
            turnos[dateStr] = {};
        }
        
        // Crear una copia del turno para cada día
        turnos[dateStr][personalId] = { ...turnoData };
        
        // Avanzar al siguiente día
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Función para eliminar eventos de múltiples días
function removeMultiDayEvent(personalId, fechaInicio, fechaFin) {
    if (!fechaInicio || !fechaFin) return;
    
    // Crear fechas usando el constructor con parámetros separados para evitar problemas de zona horaria
    const startParts = fechaInicio.split('-');
    const endParts = fechaFin.split('-');
    
    const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return;
    }
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        const dateStr = formatDate(currentDate);
        
        if (turnos[dateStr] && turnos[dateStr][personalId]) {
            delete turnos[dateStr][personalId];
            
            // Si no hay más turnos en esta fecha, eliminar la fecha completa
            if (Object.keys(turnos[dateStr]).length === 0) {
                delete turnos[dateStr];
            }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
}

// Persistencia de datos
function saveData() {
    try {
        // Intentar usar localStorage primero
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem('vigilancia-personal', JSON.stringify(personal));
            localStorage.setItem('vigilancia-turnos', JSON.stringify(turnos));
            console.log('Datos guardados correctamente en localStorage');
            // Respaldo automático versionado (throttled)
            scheduleAutoBackup();
        } else {
            // Fallback: usar cookies si localStorage no está disponible
            setCookie('vigilancia-personal', JSON.stringify(personal), 365);
            setCookie('vigilancia-turnos', JSON.stringify(turnos), 365);
            console.log('Datos guardados en cookies (fallback)');
        }
    } catch (e) {
        console.error('Error guardando datos:', e);
        // Intentar fallback con cookies
        try {
            setCookie('vigilancia-personal', JSON.stringify(personal), 365);
            setCookie('vigilancia-turnos', JSON.stringify(turnos), 365);
            showNotification('Datos guardados usando cookies (modo compatibilidad)');
        } catch (cookieError) {
            console.error('Error guardando en cookies:', cookieError);
            showNotification('Error: No se pudieron guardar los datos. Verifique la configuración del navegador.');
        }
    }
}

// Función para calcular estadísticas anuales
function calculateAnnualStats(year) {
    const stats = {};
    
    // Inicializar estadísticas para cada persona
    personal.forEach(persona => {
        stats[persona.id] = {
            nombre: persona.nombre,
            apellido: persona.apellido,
            guardias: 0,
            ausentes: 0,
            compensatorios: 0,
            estres: 0,
            articulo26: 0,
            vacaciones: 0,
            carpeta_medica: 0,
            cambios_guardia: 0,
            dia_sindical: 0,
            dia_estudio: 0
        };
    });
    
    // Contar turnos del año especificado
    Object.keys(turnos).forEach(fecha => {
        const fechaTurno = new Date(fecha);
        if (fechaTurno.getFullYear() === year) {
            Object.keys(turnos[fecha]).forEach(personalId => {
                const turno = turnos[fecha][personalId];
                if (stats[personalId]) {
                    switch (turno.tipo) {
                        case 'guardia_fija':
                        case 'guardia_rotativa':
                            stats[personalId].guardias++;
                            break;
                        case 'ausente':
                            stats[personalId].ausentes++;
                            break;
                        case 'compensatorio':
                            stats[personalId].compensatorios++;
                            break;
                        case 'estres':
                            stats[personalId].estres++;
                            break;
                        case 'articulo26':
                            stats[personalId].articulo26++;
                            break;
                        case 'vacaciones':
                            stats[personalId].vacaciones++;
                            break;
                        case 'carpeta_medica':
                            stats[personalId].carpeta_medica++;
                            break;
                        case 'cambios_guardia':
                            stats[personalId].cambios_guardia++;
                            break;
                        case 'dia_sindical':
                            stats[personalId].dia_sindical++;
                            break;
                        case 'dia_estudio':
                            stats[personalId].dia_estudio++;
                            break;
                    }
                }
            });
        }
    });
    
    return stats;
}

// Función para guardar log anual
function saveAnnualLog(year, stats) {
    try {
        const logData = {
            year: year,
            timestamp: new Date().toISOString(),
            statistics: stats,
            totalPersonal: personal.length
        };
        
        // Obtener logs existentes
        let annualLogs = [];
        if (typeof(Storage) !== "undefined") {
            const savedLogs = localStorage.getItem('vigilancia-annual-logs');
            if (savedLogs) {
                annualLogs = JSON.parse(savedLogs);
            }
        }
        
        // Verificar si ya existe un log para este año
        const existingLogIndex = annualLogs.findIndex(log => log.year === year);
        if (existingLogIndex !== -1) {
            // Actualizar log existente
            annualLogs[existingLogIndex] = logData;
        } else {
            // Agregar nuevo log
            annualLogs.push(logData);
        }
        
        // Mantener solo los últimos 10 años de logs
        annualLogs = annualLogs.sort((a, b) => b.year - a.year).slice(0, 10);
        
        // Guardar logs actualizados
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem('vigilancia-annual-logs', JSON.stringify(annualLogs));
        }
        
        console.log(`Log anual guardado para el año ${year}`);
        return true;
    } catch (e) {
        console.error('Error guardando log anual:', e);
        return false;
    }
}

// Función para resetear datos anuales
// mode: 'automatic' (archiva año anterior) | 'manual' (archiva año actual)
function resetAnnualData(mode = 'automatic') {
    if (!isAdmin()) {
        showNotification('Acción restringida. Solo el admin puede resetear datos anuales.');
        return false;
    }
    const currentYear = new Date().getFullYear();
    const yearToArchive = mode === 'manual' ? currentYear : currentYear - 1;
    const nextCycleYear = mode === 'manual' ? currentYear + 1 : currentYear;
    
    // Calcular estadísticas del año a archivar
    const statsToArchive = calculateAnnualStats(yearToArchive);
    
    // Guardar log del año correspondiente
    const logSaved = saveAnnualLog(yearToArchive, statsToArchive);
    
    if (logSaved) {
        // Eliminar turnos del año archivado y anteriores
        const turnosToKeep = {};
        Object.keys(turnos).forEach(fecha => {
            const fechaTurno = new Date(fecha);
            if (fechaTurno.getFullYear() >= nextCycleYear) {
                turnosToKeep[fecha] = turnos[fecha];
            }
        });
        
        turnos = turnosToKeep;
        
        // Guardar datos actualizados
        saveData();
        
        // Actualizar interfaz
        renderCalendar();
        
        showNotification(`Datos del año ${yearToArchive} archivados correctamente. Sistema reiniciado para ${nextCycleYear}.`);
        console.log(`Reset anual (${mode}) completado. Datos de ${yearToArchive} guardados en logs.`);
        
        return true;
    } else {
        showNotification('Error al archivar datos del año seleccionado. Reset cancelado.');
        return false;
    }
}

// Función para verificar si es necesario hacer reset anual
function checkAnnualReset() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Verificar si es 1 de enero
    if (currentDate.getMonth() === 0 && currentDate.getDate() === 1) {
        // Verificar si ya se hizo el reset este año
        const lastResetYear = localStorage.getItem('vigilancia-last-reset-year');
        
        if (!lastResetYear || parseInt(lastResetYear) < currentYear) {
            // Mostrar confirmación al usuario
            if (confirm(`¡Es 1 de enero de ${currentYear}!\n\n¿Desea archivar las estadísticas del año ${currentYear - 1} y reiniciar el sistema para el nuevo año?\n\nEsto guardará todas las estadísticas del año anterior en los logs y limpiará los datos para comenzar el nuevo año.`)) {
                const resetSuccess = resetAnnualData('automatic');
                if (resetSuccess) {
                    localStorage.setItem('vigilancia-last-reset-year', currentYear.toString());
                }
            }
        }
    }
}

// Función para obtener logs anuales
function getAnnualLogs() {
    try {
        if (typeof(Storage) !== "undefined") {
            const savedLogs = localStorage.getItem('vigilancia-annual-logs');
            if (savedLogs) {
                return JSON.parse(savedLogs);
            }
        }
        return [];
    } catch (e) {
        console.error('Error cargando logs anuales:', e);
        return [];
    }
}

// Función para cambiar entre tabs de estadísticas
function switchStatsTab(tab) {
    const currentTab = document.getElementById('current-stats-tab');
    const logsTab = document.getElementById('annual-logs-tab');
    const movementTab = document.getElementById('movement-logs-tab');
    const currentContent = document.getElementById('current-stats-content');
    const logsContent = document.getElementById('annual-logs-content');
    const movementContent = document.getElementById('movement-logs-content');

    const setActive = (tabBtn, contentEl, active) => {
        if (!tabBtn || !contentEl) return;
        if (active) {
            tabBtn.classList.add('active');
            contentEl.style.display = 'block';
            contentEl.classList.add('active');
        } else {
            tabBtn.classList.remove('active');
            contentEl.style.display = 'none';
            contentEl.classList.remove('active');
        }
    };

    setActive(currentTab, currentContent, tab === 'current');
    setActive(logsTab, logsContent, tab === 'logs');
    setActive(movementTab, movementContent, tab === 'movements');
}

// Función para cargar y mostrar logs anuales
function loadAnnualLogs() {
    const logs = getAnnualLogs();
    const logsContainer = document.getElementById('annual-logs-list');

    if (!logsContainer) return;

    logsContainer.innerHTML = '';

    if (logs.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'no-logs-message';
        emptyMessage.innerHTML = '<i class="fas fa-archive"></i><p>No hay logs anuales disponibles</p>';
        logsContainer.appendChild(emptyMessage);
        return;
    }

    logs.forEach(log => {
        // Crear tarjeta/contendor del año
        const card = document.createElement('div');
        card.className = 'annual-log-card';

        // Header con botón del año
        const header = document.createElement('div');
        header.className = 'log-card-header';
        header.innerHTML = `
            <h4>Año ${log.year}</h4>
            <div class="log-card-info">Archivado: ${formatDateShort(new Date(log.timestamp))}</div>
            <button class="btn-secondary year-log-btn" data-year="${log.year}">Ver</button>
        `;

        // Contenido colapsable
        const content = document.createElement('div');
        content.className = 'log-card-content';
        content.style.display = 'none';

        const table = document.createElement('table');
        table.className = 'log-stats-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Personal</th>
                    <th>Guardias</th>
                    <th>Ausentes</th>
                    <th>Compensatorios</th>
                    <th>Estrés</th>
                    <th>Art. 26</th>
                    <th>Vacaciones</th>
                    <th>C. Médica</th>
                    <th>Cambios Guardia</th>
                    <th>Día Sindical</th>
                    <th>Día de Estudio</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        Object.values(log.statistics).forEach(stats => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${stats.nombre} ${stats.apellido}</td>
                <td>${stats.guardias}</td>
                <td>${stats.ausentes}</td>
                <td>${stats.compensatorios}</td>
                <td>${stats.estres}</td>
                <td>${stats.articulo26}</td>
                <td>${stats.vacaciones}</td>
                <td>${stats.carpeta_medica}</td>
                <td>${stats.cambios_guardia || 0}</td>
                <td>${stats.dia_sindical || 0}</td>
                <td>${stats.dia_estudio || 0}</td>
            `;
            tbody.appendChild(row);
        });

        content.appendChild(table);
        card.appendChild(header);
        card.appendChild(content);
        logsContainer.appendChild(card);

        // Toggle de contenido al pulsar el botón
        const toggleBtn = header.querySelector('.year-log-btn');
        toggleBtn.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? 'Ocultar' : 'Ver';
        });
    });
}

// Logs de movimientos
function getMovementLogs() {
    try {
        if (typeof(Storage) !== "undefined") {
            const saved = localStorage.getItem('vigilancia-movement-logs');
            if (saved) return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error leyendo movement logs:', e);
    }
    return [];
}

function addMovementLog(entry) {
    try {
        const logs = getMovementLogs();
        logs.unshift(entry);
        // Limitar tamaño a últimos 300 movimientos
        const trimmed = logs.slice(0, 300);
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem('vigilancia-movement-logs', JSON.stringify(trimmed));
        }
    } catch (e) {
        console.error('Error guardando movement log:', e);
    }
}

function loadMovementLogs() {
    const listEl = document.getElementById('movement-logs-list');
    if (!listEl) return;
    const logs = getMovementLogs();
    // Filtrado por personal si hay selección
    const personalFilterEl = document.getElementById('movement-log-personal-filter');
    const selectedPersonalId = personalFilterEl ? (personalFilterEl.value || '') : '';
    const filteredLogs = (function(){
        if (!selectedPersonalId) return logs;
        return logs.filter(l => {
            const d = l.details || {};
            // Para entity 'personal' usamos id directamente; para 'turno' usamos personalId
            if (l.entity === 'personal') {
                return String(d.id || '') === String(selectedPersonalId);
            } else if (l.entity === 'turno') {
                return String(d.personalId || '') === String(selectedPersonalId);
            }
            return false;
        });
    })();
    listEl.innerHTML = '';

    if (filteredLogs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'no-logs-message';
        empty.innerHTML = '<i class="fas fa-list"></i><p>No hay movimientos registrados</p>';
        listEl.appendChild(empty);
        return;
    }

    // Helpers para formato legible
    const actionBadgeClass = (action) => {
        if (!action) return 'badge';
        if (action.includes('add')) return 'badge badge-add';
        if (action.includes('edit')) return 'badge badge-edit';
        if (action.includes('delete')) return 'badge badge-delete';
        return 'badge';
    };
    const entityBadgeClass = (entity) => {
        if (entity === 'turno') return 'badge badge-turno';
        if (entity === 'personal') return 'badge badge-personal';
        if (entity === 'login') return 'badge badge-login';
        return 'badge';
    };

    let lastDateLabel = null;
    filteredLogs.forEach((log) => {
        const dt = new Date(log.timestamp);
        const dateLabel = formatDateShort(dt);
        const timeLabel = dt.toLocaleTimeString('es-ES');

        // Insertar separador de fecha cuando cambia el día
        if (dateLabel !== lastDateLabel) {
            const group = document.createElement('div');
            group.className = 'movement-date-group';
            group.innerHTML = `
                <span class="date-label">${dateLabel}</span>
                <span class="date-line"></span>
            `;
            listEl.appendChild(group);
            lastDateLabel = dateLabel;
        }

        const item = document.createElement('div');
        item.className = 'movement-log-item';
        const userStr = log.user ? `${log.user.username} (${log.user.role})` : 'N/D';
        const d = log.details || {};
        const detailsStr = (function() {
            if (log.entity === 'personal') {
                const nombreCompleto = [d.nombre, d.apellido].filter(Boolean).join(' ');
                return nombreCompleto || (d.id ? `ID ${d.id}` : '');
            } else if (log.entity === 'turno') {
                const tipoStr = prettify(d.tipo || '');
                const fechaStr = d.fecha ? formatDateShort(d.fecha) : '';
                const partes = [d.nombre, fechaStr, tipoStr].filter(Boolean);
                return partes.join(' · ');
            } else if (log.entity === 'login') {
                const u = d.username || (log.user && log.user.username) || '-';
                const attempted = d.attempted ? ' • Intento de contraseña' : '';
                const passInfo = d.password ? ` • Contraseña: ${d.password}` : '';
                return `Usuario: ${u}${attempted}${passInfo}`;
            }
            return '';
        })();

        const actClass = actionBadgeClass(log.action || '');
        const entClass = entityBadgeClass(log.entity || '');
        const actLabel = prettify(log.action || '');
        const entLabel = prettify(log.entity || '');

        item.innerHTML = `
            <div class="movement-log-header">
                <span class="log-time">${timeLabel}</span>
                <span class="log-user">${userStr}</span>
            </div>
            <div class="movement-log-body">
                <div>
                    <span class="${actClass}">${actLabel}</span>
                    <span class="${entClass}" style="margin-left:6px;">${entLabel}</span>
                </div>
                <div class="log-details">${detailsStr}</div>
            </div>
        `;
        // Hacer el item clickeable como botón
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.addEventListener('click', () => openMovementLogModal(log));
        item.addEventListener('keypress', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                openMovementLogModal(log);
            }
        });
        listEl.appendChild(item);
    });
}

// Helper global para capitalizar y hacer legibles etiquetas/valores
function prettify(str) {
    if (!str) return '';
    return String(str)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Abrir modal de detalle de movimiento
function openMovementLogModal(log) {
    const modal = document.getElementById('movement-log-modal');
    const closeBtn = document.getElementById('close-movement-log-modal');
    if (!modal) return;
    closeHamburgerMenu();

    const dt = new Date(log.timestamp);
    const fechaStr = formatDateShort(dt);
    const horaStr = dt.toLocaleTimeString('es-ES');
    const usuarioStr = log.user ? `${log.user.username} (${log.user.role})` : 'N/D';
    const accionStr = (log.action || '').replace(/_/g, ' ');
    const entidadStr = (log.entity || '').replace(/_/g, ' ');

    const dateEl = document.getElementById('movement-log-date');
    const timeEl = document.getElementById('movement-log-time');
    const userEl = document.getElementById('movement-log-user');
    const actionEl = document.getElementById('movement-log-action');
    const entityEl = document.getElementById('movement-log-entity');
    const detailsEl = document.getElementById('movement-log-details');

    if (dateEl) dateEl.textContent = fechaStr;
    if (timeEl) timeEl.textContent = horaStr;
    if (userEl) userEl.textContent = usuarioStr;
    if (actionEl) actionEl.textContent = prettify(accionStr);
    if (entityEl) entityEl.textContent = prettify(entidadStr);
    if (detailsEl) {
        detailsEl.innerHTML = renderMovementLogDetailsHTML(log);
    }

    modal.style.display = 'block';
    lockBodyScroll();

    const onClose = () => {
        modal.style.display = 'none';
        modal.removeEventListener('click', overlayHandler);
        if (closeBtn) closeBtn.removeEventListener('click', onClose);
        unlockBodyScroll();
    };
    const overlayHandler = (ev) => {
        if (ev.target === modal) onClose();
    };
    modal.addEventListener('click', overlayHandler);
    if (closeBtn) closeBtn.addEventListener('click', onClose);
}

// Render de detalles para modal
function renderMovementLogDetailsHTML(log) {
    const d = log.details || {};
    const action = log.action || '';
    const entity = log.entity || '';

    const formatFecha = (f) => f ? formatDateShort(f) : '';

    if (entity === 'personal') {
        const nombre = [d.nombre, d.apellido].filter(Boolean).join(' ');
        const base = `<p><strong>Personal:</strong> ${nombre || (d.id ? 'ID ' + d.id : '-')}</p>`;
        if (action === 'personal_delete') {
            const prev = d; // en delete, details ya contiene snapshot
            const prevNombre = [prev.nombre, prev.apellido].filter(Boolean).join(' ');
            return base + `
                <div class="detail-block">
                    <p><strong>Registro eliminado:</strong></p>
                    <ul>
                        <li><strong>Nombre:</strong> ${prevNombre || '-'}</li>
                        <li><strong>Modalidad:</strong> ${prettify(prev.modalidadTrabajo || '')}</li>
                        <li><strong>Vacaciones:</strong> ${prev.diasVacaciones ?? '-'}</li>
                        <li><strong>Estrés:</strong> ${prev.diasEstres ?? '-'}</li>
                    </ul>
                </div>`;
        } else if (action === 'personal_edit') {
            const before = d.before || {};
            const beforeNombre = [before.nombre, before.apellido].filter(Boolean).join(' ');
            return base + `
                <div class="detail-block">
                    <p><strong>Cambios realizados:</strong></p>
                    <ul>
                        <li><strong>Antes:</strong> ${beforeNombre || '-'} · ${prettify(before.modalidadTrabajo || '')}</li>
                        <li><strong>Ahora:</strong> ${nombre || '-'} · ${prettify(d.modalidadTrabajo || '')}</li>
                    </ul>
                </div>`;
        } else if (action === 'personal_add') {
            return base + `
                <div class="detail-block">
                    <p><strong>Nuevo registro:</strong></p>
                    <ul>
                        <li><strong>Modalidad:</strong> ${prettify(d.modalidadTrabajo || '')}</li>
                        <li><strong>Vacaciones:</strong> ${d.diasVacaciones ?? '-'}</li>
                        <li><strong>Estrés:</strong> ${d.diasEstres ?? '-'}</li>
                    </ul>
                </div>`;
        }
        return base;
    } else if (entity === 'turno') {
        const nombre = d.nombre || '-';
        const fecha = formatFecha(d.fecha);
        const tipo = prettify(d.tipo || '');
        const base = `<p><strong>Personal:</strong> ${nombre}</p>
                      <p><strong>Fecha:</strong> ${fecha}</p>
                      <p><strong>Tipo:</strong> ${tipo}</p>`;

        if (action === 'turno_delete') {
            const prev = d.before || {};
            const prevTipo = prettify(prev.tipo || '');
            const prevHE = prev.horaEntrada || '-';
            const prevHS = prev.horaSalida || '-';
            const prevObs = prev.observaciones || '-';
            return base + `
                <div class="detail-block">
                    <p><strong>Turno eliminado:</strong></p>
                    <ul>
                        <li><strong>Tipo:</strong> ${prevTipo}</li>
                        <li><strong>Entrada:</strong> ${prevHE}</li>
                        <li><strong>Salida:</strong> ${prevHS}</li>
                        <li><strong>Observaciones:</strong> ${prevObs}</li>
                    </ul>
                </div>`;
        } else if (action === 'turno_edit') {
            const before = d.before || {};
            const beforeTipo = prettify(before.tipo || '');
            const beforeHE = before.horaEntrada || '-';
            const beforeHS = before.horaSalida || '-';
            const beforeObs = before.observaciones || '-';
            const nowHE = d.horaEntrada || '-';
            const nowHS = d.horaSalida || '-';
            const nowObs = d.observaciones || '-';
            return base + `
                <div class="detail-block">
                    <p><strong>Cambios realizados:</strong></p>
                    <ul>
                        <li><strong>Antes:</strong> ${beforeTipo} · ${beforeHE} - ${beforeHS} · ${beforeObs}</li>
                        <li><strong>Ahora:</strong> ${tipo} · ${nowHE} - ${nowHS} · ${nowObs}</li>
                    </ul>
                </div>`;
        } else if (action === 'turno_add') {
            const he = d.horaEntrada || '-';
            const hs = d.horaSalida || '-';
            const obs = d.observaciones || '-';
            return base + `
                <div class="detail-block">
                    <p><strong>Turno agregado:</strong></p>
                    <ul>
                        <li><strong>Entrada:</strong> ${he}</li>
                        <li><strong>Salida:</strong> ${hs}</li>
                        <li><strong>Observaciones:</strong> ${obs}</li>
                    </ul>
                </div>`;
        }
        return base;
    } else if (entity === 'login') {
        const u = d.username || (log.user && log.user.username) || '-';
        if (action === 'login_failed') {
            const attempted = d.attempted ? 'Sí' : 'No';
            const passInfo = d.password ? d.password : '-';
            return `
                <div class="detail-block">
                    <p><strong>Intento de inicio de sesión fallido</strong></p>
                    <ul>
                        <li><strong>Usuario:</strong> ${u}</li>
                        <li><strong>Intento de contraseña:</strong> ${attempted}</li>
                        <li><strong>Contraseña usada:</strong> ${passInfo}</li>
                    </ul>
                </div>`;
        }
        return `<p><strong>Login:</strong> Usuario ${u}</p>`;
    }
    return '<p>Sin detalles</p>';
}

function loadData() {
    try {
        let savedPersonal, savedTurnos;
        
        // Intentar cargar desde localStorage primero
        if (typeof(Storage) !== "undefined") {
            savedPersonal = localStorage.getItem('vigilancia-personal');
            savedTurnos = localStorage.getItem('vigilancia-turnos');
        }
        
        // Si no hay datos en localStorage, intentar cookies
        if (!savedPersonal || !savedTurnos) {
            savedPersonal = savedPersonal || getCookie('vigilancia-personal');
            savedTurnos = savedTurnos || getCookie('vigilancia-turnos');
        }
        
        if (savedPersonal) {
            try {
                personal = JSON.parse(savedPersonal);
                if (!Array.isArray(personal)) {
                    personal = [];
                }
            } catch (e) {
                console.error('Error parsing personal data:', e);
                personal = [];
            }
        }
        
        if (savedTurnos) {
            try {
                turnos = JSON.parse(savedTurnos);
                // turnos debe ser un objeto, no un array
                if (typeof turnos !== 'object' || turnos === null || Array.isArray(turnos)) {
                    turnos = {};
                }
            } catch (e) {
                console.error('Error parsing turnos data:', e);
                turnos = {};
            }
        }
        
        console.log('Datos cargados:', { personal: personal.length, turnos: Object.keys(turnos).length });
    } catch (e) {
        console.error('Error accediendo a almacenamiento:', e);
        showNotification('Advertencia: No se pudieron cargar los datos guardados.');
    }
}

// Funciones auxiliares para cookies (fallback)
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}
// Modal de confirmación genérico
function showConfirmModal({ title, message, onAccept, onCancel }) {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const acceptBtn = document.getElementById('confirm-accept-btn');
    const headerEl = modal ? modal.querySelector('.confirmation-header') : null;
    const iconEl = headerEl ? headerEl.querySelector('.warning-icon') : null;
    if (!modal || !cancelBtn || !acceptBtn) {
        if (typeof onCancel === 'function') onCancel();
        return;
    }
    if (titleEl) titleEl.textContent = title || 'Confirmación';
    if (msgEl) msgEl.textContent = message || '¿Está seguro?';
    closeHamburgerMenu();
    modal.style.display = 'block';
    lockBodyScroll();
    const cleanup = () => {
        modal.style.display = 'none';
        acceptBtn.removeEventListener('click', acceptHandler);
        cancelBtn.removeEventListener('click', cancelHandler);
        modal.removeEventListener('click', overlayHandler);
        if (headerEl) headerEl.classList.remove('accepted');
        if (iconEl) iconEl.classList.remove('accepted');
        unlockBodyScroll();
    };
    const acceptHandler = () => {
        // Cambiar a estado aceptado: header verde y icono check
        if (headerEl) headerEl.classList.add('accepted');
        if (iconEl) {
            iconEl.classList.add('accepted');
            iconEl.classList.remove('fa-exclamation-triangle');
            iconEl.classList.add('fa-check-circle');
        }
        // Pequeño retraso para que el usuario perciba el cambio
        setTimeout(() => {
            cleanup();
            if (typeof onAccept === 'function') onAccept();
        }, 550);
    };
    const cancelHandler = () => {
        cleanup();
        if (typeof onCancel === 'function') onCancel();
    };
    const overlayHandler = (ev) => {
        if (ev.target === modal) {
            cancelHandler();
        }
    };
    acceptBtn.addEventListener('click', acceptHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    modal.addEventListener('click', overlayHandler);
}