var pjson = require('../package.json');
const got = require('got');
let credenciales;
let QDCApiConfig;
let audio;
let estaReproduciendo;

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

window.onload = function () {

    let username = localStorage.getItem("username");
    let password = localStorage.getItem("password");

    credenciales = `Basic ${window.btoa(`${username}:${password}`)}`;

    var QDCApi = pjson.urlapi;

    QDCApiConfig =
        {
            ObtenerPedidosReporte: `${QDCApi}api/ObtenerPedidosReporte`
        };

    audio = new Audio($('#notificacion-sound').val());
    audio.loop = true;
    LlamarObtenerPedidosReporte();
}

async function LlamarObtenerPedidosReporte() {

    ShowSpinner();
    (async () => {
        try {
            const response = await got.post(QDCApiConfig.ObtenerPedidosReporte, { headers: { 'Authorization': credenciales }, json: true, timeout: 6000 });
            console.log(response.body);
            HideSpinner();
            var isSuccessful = isSuccessfulResponse(response.body);
            if (isSuccessful) {
                PintarListadoRerpote(response.body.respuesta);
            } else {
                HideSpinner();
            }

        } catch (error) {
            console.log(error.response.body)
            MostrarAlertaError();
            HideSpinner();
        }
    })();

}

function PintarListadoRerpote(pedidos) {
    var $tabla = $('#listado-reporte');
    var totalInicial = 0;
    $tabla.find('tbody tr').remove();
    var reproducirAudio = false;
    for (var pedido of pedidos) {

        if (pedido.Estatus === 1) {
            reproducirAudio = true;
            totalInicial++;
        }

        $tabla.append(`
        <tr>
            <td class="text-center">
            ${pedido.FechaRegistro}
            </td>
            <td>
                ${pedido.NombreComensal}
            </td>
            <td>
                ${pedido.Folio}
            </td>
            <td class="text-center">
                ${pedido.TipoPago}
            </td>
            <td class="text-right">
                ${pedido.Total}
            </td>
            <td class="text-right">
                ${pedido.Banco}
            </td>
            <td class="text-right">
                ${pedido.QDC}
            </td>
            <td class="text-right">
                ${pedido.CostoEnvio}
            </td>
            <td class="text-right">
                ${pedido.Ingreso}
            </td>
         </tr>`);

    }

    if (reproducirAudio) {
        sonaralerta();
    } else {
        deteneralerta();
    }

}
function isSuccessfulResponse(res) {
    return res.estatusPeticion.ResponseCode == responseCodes.codigoOk;
}

function ShowSpinner() {
    var spinner = $("#spinner-load");
    spinner.addClass('loader');
}
function HideSpinner() {

    var spinner = $("#spinner-load");
    spinner.removeClass('loader');
}
function sonaralerta() {
    if (estaReproduciendo) { return; }
    audio.play();
    estaReproduciendo = true;
}

function deteneralerta() {
    if (!estaReproduciendo) { return; }
    audio.pause();
    estaReproduciendo = false;
}
