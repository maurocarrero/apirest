'use strict';

// SERVER

var express = require('express'),
  http = require('http'),
  xml2js = require('xml2js'),
  js2xmlparser = require('js2xmlparser'),
  app = express(),
  server = http.createServer(app),

// VARS

  modelo = {
    empleados: []
  },
  i,
  currentId,

// UTILS

  generateId = function () {
    currentId = currentId + 1 || 1;
    return currentId;
  },

  findEmpleado = function (id) {
    for (i = 0; i < modelo.empleados.length; i += 1) {
      if (modelo.empleados[i].id === id) {
        return i;
      }
    }
  },

  validateId = function (id) {
    return typeof id === 'number' && id > 0;
  },

  parseData = function (data, contentType, titulo) {
    var aux;
    if (contentType === 'application/xml' || contentType === 'text/xml') {
      if (data.empleados) {
        aux = {
          empleado: data.empleados
        };
      } else {
        aux = data;
      }
      return js2xmlparser(titulo || 'empleados', aux);
    }
    return JSON.stringify(data);
  },

  getObjectFromXML = function (xml) {
    var parseString = xml2js.parseString, obj = {}, nombre, salario;
    try {
      parseString(xml, function (err, result) {
        if (result && result.empleado) {
          nombre = result.empleado.nombre ? result.empleado.nombre[0] : undefined;
          salario = result.empleado.salario ? result.empleado.salario[0] : undefined;
          obj.empleado = {
            nombre: nombre,
            salario: salario
          };
        }
        if (err) {
          console.log('ERROR: ' + err);
        }
      });
    } catch (e) {
      console.log(e);
    }
    if (obj && obj.empleado) {
      return obj.empleado;
    }
    return null;
  },

  getObjectFromJSON = function (json) {
    var data;
    try {
      data = JSON.parse(json);
      return data;
    } catch (e) {
      console.log(e);
    }
    return null;
  },

  getRequestData = function (req) {
    var accept = req.headers.accept, data = null;
    if (accept === 'application/xml' || accept === 'text/xml') {
      data = getObjectFromXML(req.rawBody);
    }
    if (accept === 'application/json') {
      data = getObjectFromJSON(req.rawBody);
    }
    return data;
  },

  getContentType = function (cType) {
    return (cType === 'application/xml' ||
      cType === 'text/xml' ||
      cType === 'application/json') ? cType : null;
  },

  getAccept = function (accept) {
    return (accept === 'application/xml' ||
      accept === 'text/xml' ||
      accept === 'application/json') ? accept : null;
  },

  cleanHeaders = function (req, callback) {
    var method = req.method;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      req.headers['Content-Type'] = '';
    }
    if (method === 'GET') {
      req.headers.accept = '';
    }
    callback();
  },

// CRUD

  getEmpleados = function (req, res) {
    var contentType = getContentType(req.headers['content-type']);

    console.log('GET all');

    if (modelo.empleados.length > 0 && contentType) {
      res.setHeader('Content-Type', contentType);
      res.send(parseData(modelo, contentType));
    } else {
      if (!contentType) {
        res.statusCode = 415;
        res.send('Debe especificar el formato de la respuesta: XML o JSON únicamente.');
      }
      res.send('No existen empleados');
    }
  },

  getEmpleado = function (req, res) {
    var id = parseInt(req.params.id, 10),
      contentType = getContentType(req.headers['content-type']),
      empleado;

    if (validateId(id)) {
      empleado = modelo.empleados[findEmpleado(id)];

      if (empleado && contentType) {
        res.setHeader('Content-Type', contentType);
        res.send(parseData(empleado, contentType, 'empleado'));
      } else {
        if (!contentType) {
          res.statusCode = 415;
          res.send('Debe especificar el formato de la respuesta: XML o JSON únicamente.');
        }
        res.send('No se encuentra el empleado ' + id);
      }
    } else {
      res.send('Error: ID incorrecto');
    }
  },

  addEmpleado = function (req, res) {
    var newEmpleado = {}, 
      accept = getAccept(req.headers.accept),
      data;

    console.log('POST / add');

    if (accept) {
      data = getRequestData(req); 
      if (data && data.nombre) {
        newEmpleado.id = generateId();
        newEmpleado.nombre = data.nombre;
        newEmpleado.salario = data.salario;

        modelo.empleados.push(newEmpleado);
        res.statusCode = 201;
        res.send("Empleado agregado.");
      } else {
        if (data && !data.nombre) {
          res.send("Debe agregar al menos el nombre del empleado.");
        }
        res.send("Hay algún problema con los datos enviados, no se pudo procesar el nuevo empleado.");
      }
    } else {
      res.statusCode = 406;
      res.send("El formato del recurso no puede ser aceptado");
    }
  },

  updateEmpleado = function (req, res) {
    var id = parseInt(req.params.id, 10),
      accept = getAccept(req.headers.accept),
      empleado, data;

    console.log('PUT / update ' + id);

    if (accept) {
      if (validateId(id)) {
        empleado = modelo.empleados[findEmpleado(id)];
        if (empleado) {
          data = getRequestData(req);
          if (data) {
            empleado.nombre = data.nombre || empleado.nombre;
            empleado.salario = data.salario || empleado.salario;
            res.send('El empleado se actualizó correctamente.');
          } else {
            res.send("Hay algún problema con los datos enviados, no se pudo procesar el nuevo empleado.");
          }
        } else {
          res.send('No se encuentra el empleado ' + id + '.');
        }
      } else {
        res.send('Error: ID incorrecto.');
      }
    } else {
      res.statusCode = 406;
      res.send('El formato del recurso no puede ser aceptado.');
    }
  },

  deleteEmpleado = function (req, res) {
    var id = parseInt(req.params.id, 10), empleado, index;

    console.log('DELETE ' + id);

    if (validateId(id)) {
      index = findEmpleado(id);
      empleado = modelo.empleados[index];
      if (empleado) {
        modelo.empleados.splice(index, 1);
        res.send('Se eliminó el empleado ' + empleado.nombre);
      } else {

        res.send('No se encuentra el empleado ' + id);
      }
    } else {
      res.send('Error: ID incorrecto');
    }
  };

// Modelo de TEST - START
modelo.empleados = [{
  "id": 1,
  "nombre": "Roberto Grela",
  "salario": "77000"
}, {
  "id": 2,
  "nombre": "Wes Montgomery",
  "salario": "75000"
}, {
  "id": 3,
  "nombre": "Joe Pass",
  "salario": "70000"
}, {
  "id": 4,
  "nombre": "Bill Frisell",
  "salario": "33000"
}, {
  "id": 5,
  "nombre": "John Scofield",
  "salario": "40000"
}];
currentId = 5;
// Modelo de TEST - END

// Armo el rawBody del Request

app.use(function (req, res, next) {
  cleanHeaders(req, function () {
    req.rawBody = '';
    req.setEncoding('utf8');
    req.on('data', function (chunk) {
      req.rawBody += chunk;
    });
    req.on('end', function () {
      next();
    });
  });
});

// APP - Ruteo de requests

app.get('/', function (req, res) { res.redirect('/empleados'); });
app.get('/empleados', getEmpleados);
app.get('/empleado/:id?', getEmpleado);
app.post('/empleado', addEmpleado);
app.put('/empleado/:id?', updateEmpleado);
app.delete('/empleado/:id?', deleteEmpleado);

server.listen(7000, function () {
  console.log('Listening on port 7000');
});
