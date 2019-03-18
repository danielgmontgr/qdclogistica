const { BrowserWindow } = require('electron').remote
const newWindowBtn = document.getElementById('login-button');
const got = require('got');
var pjson = require('../package.json');

var QDCApiConfig = {};
var username;
var password;
var credenciales;

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
$(document).ready(function () {

  //$('body').css('display', 'none');
  //$('body').fadeIn(650);

})
window.onload = function () {

  GetUserCredentials();

  newWindowBtn.addEventListener('click', (event) => {

    event.preventDefault();
    ShowSpinner();
    username = $("#username").val();
    password = $("#password").val();
    IniciarSesion(username, password);
  });

}
function GetUserCredentials() {

  if (localStorage.username !== null && localStorage.username !== undefined) {
    $("#username").val(localStorage.username);
  }

  if (localStorage.username !== null && localStorage.username !== undefined &&
    localStorage.password !== null && localStorage.password !== undefined) {
    $("#username").val(localStorage.username);
    $("#password").val(localStorage.password);
    
      if (localStorage.autoLogin ==='true') {
        IniciarSesion(localStorage.username, localStorage.password);
      }
  }
}

var QDCApi = pjson.urlapi;

QDCApiConfig =
  {
    ObtenerPedidosRepartodo: `${QDCApi}api/ObtenerPedidosDelDia`,
    ObtenerPedidos: `${QDCApi}api/ObtenerInformacionPedidoLogisticaSucursal`,
  };

async function IniciarSesion(username, password) {

  try {
    credenciales = `Basic ${window.btoa(`${username}:${password}`)}`;

    const res = await got.post(QDCApiConfig.ObtenerPedidos, { headers: { 'Authorization': credenciales }, json: true });
    var isSuccessful = isSuccessfulResponse(res.body);
    if (isSuccessful) {
      HideSpinner();
      $('body').fadeOut(650, openLogistica);

      function openLogistica() {
        localStorage.setItem("username", username);
        localStorage.setItem("password", password);
        localStorage.setItem("autoLogin", 'true');
        location.href = `logistica.html`;
      }
    } else {
      HideSpinner();
      $("#error-modal").modal('show');
    }

    console.log(res);

  } catch (error) {

    HideSpinner();
    $("#error-modal").modal('show');
    console.log(error.response.body)
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
