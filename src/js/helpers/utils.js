const {ipcRenderer} = require('electron');

function MostrarAlertaError(mensaje){

    ipcRenderer.send('open-error-conexion');

}