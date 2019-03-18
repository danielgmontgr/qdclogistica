var Inputmask = require('inputmask');
const got = require('got');
var pjson = require('../package.json');

var QDCApiConfig = {};
var qdcCredentials = { valid: true };
var _pedidos = {};
var _ultimaActualizacionPedidosQdc;
var credenciales;
var audio;
var estaReproduciendo;
var intervaloRecarga = 60000;
let user;
let pass;
let estatus;
let response;
let idPedidoComentario;

var responseCodes = {
    codigoNoConexion: 0,
    codigoExcepcion: 1000,
    codigoOk: 2000,
    codigoAutentificacion: 3000,
    codigoPermisos: 4000,
    codigoValidacion: 5000,
    codigoOtros: 6000,
    codigoInterno: 7000,
};

var estatusPedido = {
    inicial: 1,
    cocina: 2,
    transito: 3,
    terminado: 4,
};
var credenciales;

window.onload = function () {

    user = localStorage.getItem("username");
    pass = localStorage.getItem("password");

    InitOperacionQdc();
    ActualizarPedidos();
    LlamarActivarQdc();
    setInterval(ActualizarPedidos, intervaloRecarga);

    Inputmask().mask(document.querySelectorAll("input"));
    Inputmask().mask(document.querySelectorAll("textarea"));

    $('#detalle-pedidos').on('show.bs.modal', modalOpen);
    $('#detalle-cliente').on('show.bs.modal', modalClienteOpen);
    $('#enviar-comentario').on('show.bs.modal', modalComentarioOpen);
    $('#restaurante-estatus').on('click', EstatusRestauranteQdc);
    //$('body').css('display', 'none');
    //$('body').fadeIn(650);
    audio = new Audio($('#notificacion-sound').val());
    audio.loop = true;

    $('#enviarcomentario-form').submit(function (event) {
        let comentariotexto = $('#comentario-texto').val();
        event.preventDefault();

        if (comentariotexto !== null && comentariotexto !== undefined) {
            ShowModalSpinner();
            LlamarEnviarMensajePedidoQdc(idPedidoComentario, comentariotexto, user);
            $('#comentario-texto').val('');
        }
    })
    const logout = document.getElementById('logout-button');

    logout.addEventListener('click', (event) => {

        event.preventDefault();
        openLogin();
        function openLogin() {

            //localStorage.removeItem('password');
            localStorage.setItem("autoLogin", 'false');
            location.href = `index.html`;
        }
    });

    const reloadButton = document.getElementById('reaload-button');
    reloadButton.addEventListener('click', (event) => {
        window.location.reload();
    });
}


function InitOperacionQdc() {

    var username = user;
    var password = pass;

    var QDCApi = pjson.urlapi;

    credenciales = `Basic ${window.btoa(`${username}:${password}`)}`;

    QDCApiConfig =
        {
            ObtenerPedidosRepartodo: `${QDCApi}api/ObtenerPedidosDelDia`,
            ObtenerPedidos: `${QDCApi}api/ObtenerInformacionPedidoLogisticaSucursal`,
            ObtenerPedidosReporte: `${QDCApi}api/ObtenerPedidosReporte`,
            EnviarMensajePedido: `${QDCApi}api/RegistrarMensajePedidoLogistica`,
            ActualizarPedidoListo: `${QDCApi}api/ActualizarPedidoListo`,
            ActualizarPedidoCancelado: `${QDCApi}api/ActualizarPedidoCancelado`,
            ActualizarPedidoEntregado: `${QDCApi}api/ActualizarPedidoEntregado`,
            ActualizarPedidoEnCocina: `${QDCApi}api/ActualizarPedidoEnCocina`,
            VerificarEstatusSucursal: `${QDCApi}api/VerificarEstatusSucursal`,
            ActivarSucursal: `${QDCApi}api/ActivarSucursal`,
            DesactivarSucursal: `${QDCApi}api/DesactivarSucursal`,
        };
}
function LlamarObtenerPedidosQdc(callback) {
    if (!QDCApiConfig.ObtenerPedidos) InitOperacionQdc();
    ShowSpinner();
    $.ajax({
        url: QDCApiConfig.ObtenerPedidos,
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            var isSuccessful = isSuccessfulResponse(res);
            if (isSuccessful) {
                response = res;
                _pedidos = res.respuesta;
                _ultimaActualizacionPedidosQdc = new Date();
            }
            else {
                HideSpinner();
            }
            if (typeof callback !== 'undefined')
                callback(isSuccessful, res);
            else HideSpinner();
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
            else HideSpinner();
        },
        complete: function () {
            HideSpinner();
        }
    });
}

function ActualizarPedidos() {

    if (new Date().getHours() == 0) {

        location.href = `index.html`;

    } else {

        LlamarObtenerPedidosQdc(function (success, response) {
            console.log('LlamarObtenerPedidosQdc : success=' + success);
            if (success) {
                console.log('LlamarObtenerPedidosQdc : pedidos=' + response.respuesta.length);

                response.respuesta = response.respuesta.map(c => {
                    var hora = new Date(c.fecha);
                    c.horaFormateada = hora.toLocaleTimeString();
                    if (c.isRecogerSucursal) {
                        c.direccionEntrega = 'Recoger en sucursal';
                    }
                    c.horaFormateada = hora.toLocaleTimeString();

                    var tiempoTranscurrido = (new Date() - hora);

                    var msec = tiempoTranscurrido;
                    var hh = Math.floor(msec / 1000 / 60 / 60);
                    msec -= hh * 1000 * 60 * 60;
                    var mm = Math.floor(msec / 1000 / 60);
                    msec -= mm * 1000 * 60;

                    c.tiempoTranscurrido = `${hh}:${mm} h`;
                    return c;
                });

                pintarListado(response.respuesta);

            }
        });
    }
}

function pintarListado(pedidos) {
    if (pedidos.length <= 0) {
        $("#nombre").text(user);
    }
    var $tabla = $('#ContentTable');
    var imagen = $('#imagen').val();
    var sonido = $('#notificacion');
    var boton = '';
    var comentariosboton = '';
    $tabla.find('tbody tr').remove();
    var reproducirAudio = false;
    for (var pedido of pedidos) {
        $("#nombre").text(pedido.nombreSucursal);
        if (pedido.estatusId === 1) {
            reproducirAudio = true;

        }

        switch (pedido.estatusId) {
            case estatusPedido.inicial:
                boton = `<button class="btn btn-morado text-center" style="width:100pt" id="estatus" name="estatus" value="${pedido.estatusId}" onclick="actualizarEstatusQDC(${pedido.estatusId},${pedido.pedidoId})">${pedido.estatus}</button>`;
                break;
            case estatusPedido.cocina:
                boton = `<button class="btn btn-azul" style="width:100pt" id="estatus" name="estatus" value="${pedido.estatusId}" onclick="actualizarEstatusQDC(${pedido.estatusId},${pedido.pedidoId})">${pedido.estatus}</button>`;
                break;
            case estatusPedido.transito:
                boton = `<button class="btn btn-naranja" style="width:100pt" id="estatus" name="estatus" value="${pedido.estatusId}" onclick="actualizarEstatusQDC(${pedido.estatusId},${pedido.pedidoId})">${pedido.estatus}</button>`;
                break;
            case estatusPedido.terminado:
                boton = `<button class="btn btn-rojo" style="width:100pt" id="estatus" name="estatus" value="${pedido.estatusId}" onclick="actualizarEstatusQDC(${pedido.estatusId},${pedido.pedidoId})">${pedido.estatus}</button>`;
                break;
            default:
                boton = `<button class="btn btn-primary" style="width:100pt" id="estatus" name="estatus" value="${pedido.estatusId}" onclick="actualizarEstatusQDC(${pedido.estatusId},${pedido.pedidoId})">${pedido.estatus}</button>`;
                break;
        }
        if (pedido.listaBitacoraPedido.length > 0) {
            comentariosboton = `
        <span class="fa-stack has-badge" data-count="${(pedido.listaBitacoraPedido.length)}">
            <a class="btn btn-primary" style="width:30pt;height:30pt;background-color:#E9A048;border-color:#E9A048" data-toggle="modal" data-target="#enviar-comentario" data-idpedido="${pedido.pedidoId}">
                <i class="fas fa-comment  fa-stack-1x fa-inverse"></i>
            </a>
        </span>`
        } else {
            comentariosboton = `
            <a class="btn btn-primary" style="width:30pt;height:30pt;background-color:#E9A048;border-color:#E9A048"data-toggle="modal" data-target="#enviar-comentario" data-idpedido="${pedido.pedidoId}">
                <i style="color:white" class="fas fa-comment">
                </i>
            </a>`
        }
        $tabla.append(`<tr><td><span>0000${pedido.pedidoId}</span></td>
        <td style="width:25%" class="text-left"><a class="text-center" data-toggle="modal" data-target="#detalle-cliente" data-idcliente="${pedido.pedidoId}">
            <span class="btn btn-link text-left">${pedido.comsumidor}</span></a>
        </td>
         <td>$${pedido.subtotal.toFixed(2)}</td>
         <td>$${pedido.total.toFixed(2)}</td>
         <td class="text-center">${pedido.formaPago}</td>
         <td>${(new Date(pedido.fecha)).toLocaleTimeString()}</td>
         <td>
            <a class="btn btn-primary" style="width:30pt;height:30pt;background-color:#E9A048;border-color:#E9A048" data-toggle="modal" data-target="#detalle-pedidos" data-idpedido="${pedido.pedidoId}">
                <i style="color:white" class="fas fa-search">
                </i>
            </a>
         </td>
         <td>
            ${comentariosboton}
         </td>
         <td class="" style="text-align:center">
            ${boton}
         </td>
         </tr>`);
    }

    if (idPedidoComentario !== null && idPedidoComentario !== undefined) {

        obtenerComentarios(idPedidoComentario);
    }
    HideSpinner();
    if (reproducirAudio) {
        sonaralerta();
    } else {
        deteneralerta();
    }
}

function isSuccessfulResponse(res) {
    return res.estatusPeticion.ResponseCode == responseCodes.codigoOk;
}
function ObtenerPedidoQdc(pedidoId) {
    if (_pedidos.length == 0) {
        return [];
    } else {
        return _pedidos.filter(function (el) { return `${el.pedidoId}` === `${pedidoId}` })[0];
    }
}

function modalOpen(event) {
    var eventSource = $(event.relatedTarget);
    var modal = $(this);
    var idpedido = eventSource.data('idpedido');

    obtenerDetalle(idpedido);
}

function modalComentarioOpen(event) {
    var eventSource = $(event.relatedTarget);
    var modal = $(this);
    var idpedido = eventSource.data('idpedido');
    idPedidoComentario = eventSource.data('idpedido');
    obtenerComentarios(idpedido);
}

function modalClienteOpen(event) {
    var eventSource = $(event.relatedTarget);
    var modal = $(this);
    var idpedido = eventSource.data('idcliente');

    obtenerDetalleCliente(idpedido);
}

function obtenerDetalle(idpedido) {
    var $tabla = $('#listado-pedidos');
    $tabla.find('tbody tr').remove();
    var pedidoId = ObtenerPedidoQdc(idpedido);
    for (var detalle of pedidoId.detallePedido) {
        $tabla.append(`<tr><td class="">${detalle.nombrePlatillo}</td><td style="">${detalle.descripcion}</td><td class="text-right">$${detalle.precio.toFixed(2)}</td><td class="">${detalle.notas}</td></tr>`);
    }
}
function obtenerComentarios(idpedido) {
    // var $tabla = $('#listado-comentarios');
    // $tabla.find('tbody tr').remove();
    var $chat = $('#chat');
    //$chat.find('.incoming_msg .outgoing_msg').remove();
    $chat.find('div').remove();

    var pedidoComentarios = ObtenerPedidoQdc(idpedido);
    for (let comentario of pedidoComentarios.listaBitacoraPedido) {

        if (comentario.isConsumidor) {
            $chat.append(`
            <div class="incoming_msg">
                <div class="received_msg">
                    <div class="received_withd_msg">
                        <p>
                            ${comentario.comentario}
                        </p>
                        <span class="time_date">${(new Date(comentario.fecha)).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            `);
        } else {
            $chat.append(`
            <div class="outgoing_msg">
                <div class="sent_msg">
                    <p>
                    ${comentario.comentario}
                    </p>
                    <span class="time_date">${(new Date(comentario.fecha)).toLocaleString()}</span>
                </div>
            </div>
            `);
        }

    }

    // for (let comentario of pedidoComentarios.listaBitacoraPedido) {
    //     if (comentario.isConsumidor) {
    //         $tabla.append(`<tr><td class="text-center">${(new Date(comentario.fecha)).toLocaleTimeString()}</td>
    //             <td class="text-center">
    //                 <textarea style="width:100%;border-color:#e8e8e8" disable readonly rows="2">${comentario.comentario}</textarea>
    //             </td>
    //         </tr>`);

    //     } else {
    //         $tabla.append(`<tr style="background-color:blue"><td class="text-center">${(new Date(comentario.fecha)).toLocaleTimeString()}</td>
    //         <td class="text-center">
    //             <textarea style="width:100%;border-color:#e8e8e8" disable readonly rows="2">${comentario.comentario}</textarea>
    //         </td>
    //     </tr>`);
    //     }
    // }
    HideModalSpinner();
}

function obtenerDetalleCliente(idpedido) {
    var $tabla = $('#listado-cliente');
    $tabla.find('tbody tr').remove();
    var detalleCliente = ObtenerPedidoQdc(idpedido);
    $tabla.append(`<tr><td class="text-center">${detalleCliente.comsumidor}</td><td class="text-left">${detalleCliente.direccionEntrega}</td><td class="text-center">${detalleCliente.telefono}</td></tr>`);

}

function actualizarEstatusQDC(estatusId, pedidoId) {

    ShowSpinner();
    $.support.cors = true;

    switch (estatusId) {
        case estatusPedido.inicial:
            LlamarEstatusPedidoCocinaQdc(pedidoId, user, function (success, res) {
                console.log('LlamarEstatusPedidoCocinaQdc');
                console.log('success:' + success);
                console.log('res:' + res);
                ActualizarPedidos();
            });
            break;
        case estatusPedido.cocina:
            LlamarEstatusPedidoListoParaEntregaQdc(pedidoId, user, function (success, res) {
                console.log('LlamarEstatusPedidoListoParaEntregaQdc');
                console.log('success:' + success);
                console.log('res:' + res);
                ActualizarPedidos();
            });
            break;
        case estatusPedido.transito:
            LlamarEstatusPedidoEntregadoQdc(pedidoId, user, function (success, res) {
                console.log('LlamarEstatusPedidoEntregadoQdc');
                console.log('success:' + success);
                console.log('res:' + res);
                ActualizarPedidos();
            });
            break;
        default:
            break;
    };
}

function LlamarEstatusPedidoCocinaQdc(idPedido, nombreUsuario, callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.ActualizarPedidoEnCocina,
        type: "POST",
        dataType: "json",
        data: JSON.stringify({
            "pedidoId": idPedido,
            "nombreUsuarioActualizo": nombreUsuario,
        }),
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {

            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
            HideSpinner();
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
            HideSpinner();
        },
        complete: function () {
            HideSpinner();
        }
    });
}

function LlamarEstatusPedidoListoParaEntregaQdc(idPedido, nombreUsuario, callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.ActualizarPedidoListo,
        type: "POST",
        dataType: "json",
        data: JSON.stringify({
            "pedidoId": idPedido,
            "nombreUsuarioActualizo": nombreUsuario,
        }),
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
            HideSpinner();
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
            HideSpinner();
        },
        complete: function () {
            HideSpinner();
        }
    });
}

function LlamarEstatusPedidoEntregadoQdc(idPedido, nombreUsuario, callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.ActualizarPedidoEntregado,
        type: "POST",
        dataType: "json",
        data: JSON.stringify({
            "pedidoId": idPedido,
            "nombreUsuarioActualizo": nombreUsuario,
        }),
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            HideSpinner();
            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
        },
        error: function () {
            HideSpinner();
            if (typeof callback !== 'undefined')
                callback(false);
        },
        complete: function () {
            HideSpinner();
        }
    });
}

function sonaralerta() {
    if (estaReproduciendo) { return; }

    audio.play();
    //load(`${__dirname}/content/sound/notificacion.mp3`).then(play);
    estaReproduciendo = true;

}

function deteneralerta() {
    if (!estaReproduciendo) { return; }
    audio.pause();
    // play = pause();
    estaReproduciendo = false;
}
function LlamarValidarEstatus(callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.VerificarEstatusSucursal,
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
        },
        complete: function () {
        }
    });
}
function LlamarActivarQdc(callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.ActivarSucursal,
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {

            var isSuccessful = isSuccessfulResponse(res);
            if (isSuccessful) {

                ObtenerEstatusRestauranteQdc();
            }
            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
        },
        complete: function () {
        }
    });
}
function LlamarDesactivarQdc(callback) {
    if (!QDCApiConfig) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.DesactivarSucursal,
        type: "POST",
        dataType: "json",
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            if (typeof callback !== 'undefined')
                callback(isSuccessfulResponse(res), res);
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
        },
        complete: function () {
        }
    });
}
function EstatusRestauranteQdc() {
    ShowSpinner();
    LlamarValidarEstatus(function (success, response) {
        if (response.respuesta.sucursalEstatus) {
            LlamarDesactivarQdc(function (success) {
                console.log(success);
                ObtenerEstatusRestauranteQdc();
            });
        }
        else {
            LlamarActivarQdc(function (success) {
                console.log(success);
                ObtenerEstatusRestauranteQdc();
            });
        }
    });
}
function ObtenerEstatusRestauranteQdc() {
    LlamarValidarEstatus(function (success, response) {
        if (success) {
            console.log('LlamarValidarEstatus : estatus=' + response.respuesta.sucursalEstatus);
            if (response.respuesta.sucursalEstatus) {
                estatus = true;
                HideSpinner();
                $("#restaurante-estatus").removeClass('btn btn-danger');
                $("#restaurante-estatus").addClass('btn btn-success');
                $("#lblEstatus").text("Activo");

            } else {
                estatus = false;
                HideSpinner();
                $("#restaurante-estatus").removeClass('btn btn-success');
                $('#restaurante-estatus').addClass("btn btn-danger");
                $("#lblEstatus").text("Inactivo");


            }
        }
    });
}

function LlamarEnviarMensajePedidoQdc(idPedido, mensaje, nombreUsuario, callback) {
    if (!QDCApiConfig.EnviarMensajePedido) InitOperacionQdc();
    $.ajax({
        url: QDCApiConfig.EnviarMensajePedido,
        type: "POST",
        dataType: "json",
        data: JSON.stringify({
            "pedidoId": idPedido,
            "mensaje": mensaje,
            "nombreUsuarioRegistra": nombreUsuario,
        }),
        contentType: "application/json; charset=utf-8",
        beforeSend: function (xhr) {
            if (!qdcCredentials.valid) return false;
            xhr.setRequestHeader("Authorization", credenciales);
            return true;
        },
        success: function (res) {
            var isSuccessful = isSuccessfulResponse(res);
            if (isSuccessful) {

                ActualizarPedidos();

                // response = res;
                // _pedidos = res.respuesta;
                // _ultimaActualizacionPedidosQdc = new Date();
            }
            //callback(isSuccessful, res);
        },
        error: function () {
            if (typeof callback !== 'undefined')
                callback(false);
        },
        complete: function () {
        }
    });
}
async function LlamarObtenerPedidosReporte() {

    const res = await got.post(QDCApiConfig.ObtenerPedidos, { headers: { 'Authorization': credenciales }, json: true });
    var isSuccessful = isSuccessfulResponse(res.body);
    if (isSuccessful) {
        
    } else { 

    }
}
function ShowSpinner() {
    var spinner = $("#spinner-load");
    spinner.addClass('loader');
}
function HideSpinner() {

    var spinner = $("#spinner-load");
    spinner.removeClass('loader');
}
function ShowModalSpinner() {
    var spinner = $("#spinner-load-modal");
    spinner.addClass('loader-modal');
}
function HideModalSpinner() {

    var spinner = $("#spinner-load-modal");
    spinner.removeClass('loader-modal');
}