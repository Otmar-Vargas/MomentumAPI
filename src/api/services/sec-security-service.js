const { message } = require("@sap/cds/lib/log/cds-error");
const mongoose = require("mongoose");

async function CrudUsers(req) {
  try {
    const action = req.req.query.action;

    if (!action) {
      throw new Error("El parámetro 'action' es obligatorio.");
    }

    switch (action) {
      case "get": // Servicio para obtener usuarios con sus roles, procesos, vistas y aplicaciones
        try {
          let result;

          const userid = req?.req?.query?.userid;

          if (!userid) {
            result = await mongoose.connection
              .collection("ZTUSERS")
              .aggregate([
                {
                  $lookup: {
                    from: "ZTROLES",
                    localField: "ROLES.ROLEID",
                    foreignField: "ROLEID",
                    as: "ROLE_DETAILS",
                  },
                },
                { $unwind: "$ROLES" },
                {
                  $addFields: {
                    ROLE_DETAIL: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$ROLE_DETAILS",
                            as: "detail",
                            cond: { $eq: ["$$detail.ROLEID", "$ROLES.ROLEID"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                },
                { $unwind: "$ROLE_DETAIL.PRIVILEGES" },
                {
                  $lookup: {
                    from: "ZTVALUES",
                    let: { processId: "$ROLE_DETAIL.PRIVILEGES.PROCESSID" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ["$LABELID", "IdProcesses"] },
                              {
                                $eq: [
                                  { $concat: ["IdProcess-", "$VALUEID"] },
                                  "$$processId",
                                ],
                              },
                            ],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "ZTVALUES",
                          let: { viewId: "$VALUEPAID" },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [
                                    { $eq: ["$LABELID", "IdViews"] },
                                    {
                                      $eq: [
                                        { $concat: ["IdViews-", "$VALUEID"] },
                                        "$$viewId",
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                            {
                              $lookup: {
                                from: "ZTVALUES",
                                let: { appId: "$VALUEPAID" },
                                pipeline: [
                                  {
                                    $match: {
                                      $expr: {
                                        $and: [
                                          {
                                            $eq: ["$LABELID", "IdApplications"],
                                          },
                                          {
                                            $eq: [
                                              {
                                                $concat: [
                                                  "IdApplications-",
                                                  "$VALUEID",
                                                ],
                                              },
                                              "$$appId",
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                ],
                                as: "application",
                              },
                            },
                            {
                              $addFields: {
                                application: {
                                  $arrayElemAt: ["$application", 0],
                                },
                              },
                            },
                          ],
                          as: "view",
                        },
                      },
                      {
                        $addFields: {
                          view: { $arrayElemAt: ["$view", 0] },
                        },
                      },
                    ],
                    as: "PROCESS_INFO",
                  },
                },
                {
                  $addFields: {
                    PROCESS_INFO: { $arrayElemAt: ["$PROCESS_INFO", 0] },
                  },
                },
                {
                  $group: {
                    _id: {
                      userId: "$_id",
                      roleId: "$ROLES.ROLEID",
                      processId: "$ROLE_DETAIL.PRIVILEGES.PROCESSID",
                    },
                    PROCESS: {
                      $first: {
                        PROCESSID: "$ROLE_DETAIL.PRIVILEGES.PROCESSID",
                        PROCESSNAME: "$PROCESS_INFO.VALUE",
                        VIEWID: "$PROCESS_INFO.view.VALUEID",
                        VIEWNAME: "$PROCESS_INFO.view.VALUE",
                        APPLICATIONID: "$PROCESS_INFO.view.application.VALUEID",
                        APPLICATIONNAME: "$PROCESS_INFO.view.application.VALUE",
                        PRIVILEGES: {
                          $map: {
                            input: "$ROLE_DETAIL.PRIVILEGES.PRIVILEGEID",
                            as: "privId",
                            in: {
                              PRIVILEGEID: "$$privId",
                              PRIVILEGENAME: "$$privId",
                            },
                          },
                        },
                      },
                    },
                    ROLE_META: { $first: "$ROLES" },
                    ROLE_DETAILS: {
                      $first: {
                        ROLEID: "$ROLE_DETAIL.ROLEID",
                        ROLENAME: "$ROLE_DETAIL.ROLENAME",
                        DESCRIPTION: "$ROLE_DETAIL.DESCRIPTION",
                        DETAIL_ROW: "$ROLE_DETAIL.DETAIL_ROW",
                      },
                    },
                    USER: { $first: "$$ROOT" },
                  },
                },
                {
                  $group: {
                    _id: {
                      userId: "$_id.userId",
                      roleId: "$_id.roleId",
                    },
                    ROLEID: { $first: "$ROLE_META.ROLEID" },
                    ROLEIDSAP: { $first: "$ROLE_META.ROLEIDSAP" },
                    ROLENAME: { $first: "$ROLE_DETAILS.ROLENAME" },
                    DESCRIPTION: { $first: "$ROLE_DETAILS.DESCRIPTION" },
                    DETAIL_ROW: { $first: "$ROLE_DETAILS.DETAIL_ROW" },
                    PROCESSES: { $push: "$PROCESS" },
                    USER: { $first: "$USER" },
                  },
                },
                {
                  $group: {
                    _id: "$_id.userId",
                    ROLES: {
                      $push: {
                        ROLEID: "$ROLEID",
                        ROLEIDSAP: "$ROLEIDSAP",
                        ROLENAME: "$ROLENAME",
                        DESCRIPTION: "$DESCRIPTION",
                        DETAIL_ROW: "$DETAIL_ROW",
                        PROCESSES: "$PROCESSES",
                      },
                    },
                    USER: { $first: "$USER" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    USERID: "$USER.USERID",
                    PASSWORD: "$USER.PASSWORD",
                    USERNAME: "$USER.USERNAME",
                    ALIAS: "$USER.ALIAS",
                    FIRSTNAME: "$USER.FIRSTNAME",
                    LASTNAME: "$USER.LASTNAME",
                    BIRTHDAYDATE: "$USER.BIRTHDAYDATE",
                    COMPANYID: "$USER.COMPANYID",
                    COMPANYNAME: "$USER.COMPANYNAME",
                    COMPANYALIAS: "$USER.COMPANYALIAS",
                    CEDIID: "$USER.CEDIID",
                    EMPLOYEEID: "$USER.EMPLOYEEID",
                    EMAIL: "$USER.EMAIL",
                    PHONENUMBER: "$USER.PHONENUMBER",
                    EXTENSION: "$USER.EXTENSION",
                    DEPARTMENT: "$USER.DEPARTMENT",
                    FUNCTION: "$USER.FUNCTION",
                    STREET: "$USER.STREET",
                    POSTALCODE: "$USER.POSTALCODE",
                    CITY: "$USER.CITY",
                    REGION: "$USER.REGION",
                    STATE: "$USER.STATE",
                    COUNTRY: "$USER.COUNTRY",
                    AVATAR: "$USER.AVATAR",
                    DETAIL_ROW: "$USER.DETAIL_ROW",
                    ROLES: "$ROLES",
                  },
                },
              ])
              .toArray();
          } else {
            result = await mongoose.connection
              .collection("ZTUSERS")
              .aggregate([
                {
                  $match: {USERID: userid },
                },
                // Aquí va exactamente el mismo pipeline que en el if anterior
                {
                  $lookup: {
                    from: "ZTROLES",
                    localField: "ROLES.ROLEID",
                    foreignField: "ROLEID",
                    as: "ROLE_DETAILS",
                  },
                },
                { $unwind: "$ROLES" },
                {
                  $addFields: {
                    ROLE_DETAIL: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$ROLE_DETAILS",
                            as: "detail",
                            cond: { $eq: ["$$detail.ROLEID", "$ROLES.ROLEID"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                },
                { $unwind: "$ROLE_DETAIL.PRIVILEGES" },
                {
                  $lookup: {
                    from: "SS",
                    let: { processId: "$ROLE_DETAIL.PRIVILEGES.PROCESSID" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ["$LABELID", "IdProcesses"] },
                              {
                                $eq: [
                                  { $concat: ["IdProcess-", "$VALUEID"] },
                                  "$$processId",
                                ],
                              },
                            ],
                          },
                        },
                      },
                      {
                        $lookup: {
                          from: "SS",
                          let: { viewId: "$VALUEPAID" },
                          pipeline: [
                            {
                              $match: {
                                $expr: {
                                  $and: [
                                    { $eq: ["$LABELID", "IdViews"] },
                                    {
                                      $eq: [
                                        { $concat: ["IdViews-", "$VALUEID"] },
                                        "$$viewId",
                                      ],
                                    },
                                  ],
                                },
                              },
                            },
                            {
                              $lookup: {
                                from: "SS",
                                let: { appId: "$VALUEPAID" },
                                pipeline: [
                                  {
                                    $match: {
                                      $expr: {
                                        $and: [
                                          {
                                            $eq: ["$LABELID", "IdApplications"],
                                          },
                                          {
                                            $eq: [
                                              {
                                                $concat: [
                                                  "IdApplications-",
                                                  "$VALUEID",
                                                ],
                                              },
                                              "$$appId",
                                            ],
                                          },
                                        ],
                                      },
                                    },
                                  },
                                ],
                                as: "application",
                              },
                            },
                            {
                              $addFields: {
                                application: {
                                  $arrayElemAt: ["$application", 0],
                                },
                              },
                            },
                          ],
                          as: "view",
                        },
                      },
                      {
                        $addFields: {
                          view: { $arrayElemAt: ["$view", 0] },
                        },
                      },
                    ],
                    as: "PROCESS_INFO",
                  },
                },
                {
                  $addFields: {
                    PROCESS_INFO: { $arrayElemAt: ["$PROCESS_INFO", 0] },
                  },
                },
                {
                  $group: {
                    _id: {
                      userId: "$_id",
                      roleId: "$ROLES.ROLEID",
                      processId: "$ROLE_DETAIL.PRIVILEGES.PROCESSID",
                    },
                    PROCESS: {
                      $first: {
                        PROCESSID: "$ROLE_DETAIL.PRIVILEGES.PROCESSID",
                        PROCESSNAME: "$PROCESS_INFO.VALUE",
                        VIEWID: "$PROCESS_INFO.view.VALUEID",
                        VIEWNAME: "$PROCESS_INFO.view.VALUE",
                        APPLICATIONID: "$PROCESS_INFO.view.application.VALUEID",
                        APPLICATIONNAME: "$PROCESS_INFO.view.application.VALUE",
                        PRIVILEGES: {
                          $map: {
                            input: "$ROLE_DETAIL.PRIVILEGES.PRIVILEGEID",
                            as: "privId",
                            in: {
                              PRIVILEGEID: "$$privId",
                              PRIVILEGENAME: "$$privId",
                            },
                          },
                        },
                      },
                    },
                    ROLE_META: { $first: "$ROLES" },
                    ROLE_DETAILS: {
                      $first: {
                        ROLEID: "$ROLE_DETAIL.ROLEID",
                        ROLENAME: "$ROLE_DETAIL.ROLENAME",
                        DESCRIPTION: "$ROLE_DETAIL.DESCRIPTION",
                        DETAIL_ROW: "$ROLE_DETAIL.DETAIL_ROW",
                      },
                    },
                    USER: { $first: "$$ROOT" },
                  },
                },
                {
                  $group: {
                    _id: {
                      userId: "$_id.userId",
                      roleId: "$_id.roleId",
                    },
                    ROLEID: { $first: "$ROLE_META.ROLEID" },
                    ROLEIDSAP: { $first: "$ROLE_META.ROLEIDSAP" },
                    ROLENAME: { $first: "$ROLE_DETAILS.ROLENAME" },
                    DESCRIPTION: { $first: "$ROLE_DETAILS.DESCRIPTION" },
                    DETAIL_ROW: { $first: "$ROLE_DETAILS.DETAIL_ROW" },
                    PROCESSES: { $push: "$PROCESS" },
                    USER: { $first: "$USER" },
                  },
                },
                {
                  $group: {
                    _id: "$_id.userId",
                    ROLES: {
                      $push: {
                        ROLEID: "$ROLEID",
                        ROLEIDSAP: "$ROLEIDSAP",
                        ROLENAME: "$ROLENAME",
                        DESCRIPTION: "$DESCRIPTION",
                        DETAIL_ROW: "$DETAIL_ROW",
                        PROCESSES: "$PROCESSES",
                      },
                    },
                    USER: { $first: "$USER" },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    USERID: "$USER.USERID",
                    PASSWORD: "$USER.PASSWORD",
                    USERNAME: "$USER.USERNAME",
                    ALIAS: "$USER.ALIAS",
                    FIRSTNAME: "$USER.FIRSTNAME",
                    LASTNAME: "$USER.LASTNAME",
                    BIRTHDAYDATE: "$USER.BIRTHDAYDATE",
                    COMPANYID: "$USER.COMPANYID",
                    COMPANYNAME: "$USER.COMPANYNAME",
                    COMPANYALIAS: "$USER.COMPANYALIAS",
                    CEDIID: "$USER.CEDIID",
                    EMPLOYEEID: "$USER.EMPLOYEEID",
                    EMAIL: "$USER.EMAIL",
                    PHONENUMBER: "$USER.PHONENUMBER",
                    EXTENSION: "$USER.EXTENSION",
                    DEPARTMENT: "$USER.DEPARTMENT",
                    FUNCTION: "$USER.FUNCTION",
                    STREET: "$USER.STREET",
                    POSTALCODE: "$USER.POSTALCODE",
                    CITY: "$USER.CITY",
                    REGION: "$USER.REGION",
                    STATE: "$USER.STATE",
                    COUNTRY: "$USER.COUNTRY",
                    AVATAR: "$USER.AVATAR",
                    DETAIL_ROW: "$USER.DETAIL_ROW",
                    ROLES: "$ROLES",
                  },
                },
              ])
              .toArray();
          }

          return result;
        } catch (error) {
          throw new Error(error.message);
        }
      case "create":
        try {
          const {
            USERID,
            USERNAME,
            ALIAS,
            FIRSTNAME,
            LASTNAME,
            BIRTHDAYDATE,
            COMPANYID,
            COMPANYNAME,
            COMPANYALIAS,
            CEDIID,
            EMPLOYEEID,
            EMAIL,
            PHONENUMBER,
            EXTENSION,
            DEPARTMENT,
            FUNCTION,
            STREET,
            POSTALCODE,
            CITY,
            REGION,
            STATE,
            COUNTRY,
            ROLES,
            reguser,
          } = req?.req?.body?.users;

          const currentDate = new Date();

          // Sección para DETAIL_ROW_REG
          const detailRowReg = [
            {
              CURRENT: false,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
            {
              CURRENT: true,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
          ];

          const existente = await mongoose.connection
            .collection("ZTUSERS")
            .findOne({ USERID: USERID });
          if (existente) {
            throw new Error("El USERID ya existe.");
          }

          // ✅ Verificación de existencia de roles en la colección ZTROLES
          const roleIds = ROLES?.map((role) => role.ROLEID) || [];

          const existingRoles = await mongoose.connection
            .collection("ZTROLES")
            .find({ ROLEID: { $in: roleIds } })
            .project({ ROLEID: 1 }) // Solo obtenemos el campo ROLEID
            .toArray();

          const existingRoleIds = existingRoles.map((role) => role.ROLEID);

          const missingRoles = roleIds.filter(
            (roleId) => !existingRoleIds.includes(roleId)
          );

          if (missingRoles.length > 0) {
            return {
              message: "Algunos roles no existen en ZTROLES",
              missingRoles,
            };
          }

          // Crear el nuevo objeto de usuario
          const newUser = {
            USERID,
            USERNAME,
            ALIAS: ALIAS || "",
            FIRSTNAME,
            LASTNAME,
            BIRTHDAYDATE: BIRTHDAYDATE || "",
            COMPANYID: COMPANYID || "",
            COMPANYNAME: COMPANYNAME || "",
            COMPANYALIAS: COMPANYALIAS || "",
            CEDIID: CEDIID || "",
            EMPLOYEEID: EMPLOYEEID || "",
            EMAIL,
            PHONENUMBER: PHONENUMBER || "",
            EXTENSION: EXTENSION || "",
            DEPARTMENT: DEPARTMENT || "",
            FUNCTION: FUNCTION || "",
            STREET: STREET || "",
            POSTALCODE: POSTALCODE || "",
            CITY: CITY || "",
            REGION: REGION || "",
            STATE: STATE || "",
            COUNTRY: COUNTRY || "",
            ROLES: ROLES || [],
            DETAIL_ROW: {
              ACTIVED: true,
              DELETED: false,
              DETAIL_ROW_REG: detailRowReg,
            },
          };

          const result = await mongoose.connection
            .collection("ZTUSERS")
            .insertOne(newUser);

          return {
            message: "Usuario creado exitosamente",
            user: newUser,
          };
        } catch (error) {
          console.error("Error al crear el usuario:", error.message);
          throw error;
        }
      case "update":
        try {
          const { userid, roleid } = req?.req?.query;
          const { users } = req?.req?.body;

          if (!userid || !users || typeof users !== "object") {
            return {
              error: true,
              message: "Faltan datos requeridos: USERID o body inválido.",
            };
          }

          // Verifica si se va a modificar un rol existente
          if (roleid && users?.ROLES?.[0]?.ROLEID) {
            const newRoleId = users.ROLES[0].ROLEID;

            // Verificar si el nuevo rol ya está asignado
            const userData = await mongoose.connection
              .collection("ZTUSERS")
              .findOne({ USERID: userid });
            if (!userData) {
              return {
                error: true,
                message: `No se encontró el usuario '${userid}'.`,
              };
            }

            const alreadyHasNewRole = userData.ROLES?.some(
              (r) => r.ROLEID === newRoleId
            );
            if (alreadyHasNewRole) {
              return {
                error: true,
                message: `El usuario ya tiene asignado el ROLEID '${newRoleId}'.`,
              };
            }

            const hasOldRole = userData.ROLES?.some((r) => r.ROLEID === roleid);
            if (!hasOldRole) {
              return {
                error: true,
                message: `El usuario no tiene el ROLEID '${roleid}' asignado.`,
              };
            }

            // Verifica si el nuevo ROLEID existe
            const newRoleData = await mongoose.connection
              .collection("ZTROLES")
              .findOne({ ROLEID: newRoleId });
            if (!newRoleData) {
              return {
                error: true,
                message: `El nuevo ROLEID '${newRoleId}' no existe en ZTROLES.`,
              };
            }

            // Actualiza el rol en la posición correspondiente
            await mongoose.connection.collection("ZTUSERS").updateOne(
              {
                USERID: userid,
                "ROLES.ROLEID": roleid,
              },
              {
                $set: {
                  "ROLES.$.ROLEID": newRoleId,
                },
              }
            );
          }

          // Prepara campos adicionales a actualizar (sin ROLES)
          const { ROLES, ...otherFields } = users;

          // Actualiza los otros campos si hay alguno
          if (Object.keys(otherFields).length > 0) {
            await mongoose.connection
              .collection("ZTUSERS")
              .updateOne({ USERID: userid }, { $set: otherFields });
          }

          // Si no se especificó roleid pero sí se quiere agregar uno nuevo
          if (!roleid && users?.ROLES?.[0]?.ROLEID) {
            const newRoleId = users.ROLES[0].ROLEID;

            const newRoleData = await mongoose.connection
              .collection("ZTROLES")
              .findOne({ ROLEID: newRoleId });
            if (!newRoleData) {
              return {
                error: true,
                message: `El ROLEID '${newRoleId}' no existe en ZTROLES.`,
              };
            }

            const userData = await mongoose.connection
              .collection("ZTUSERS")
              .findOne({ USERID: userid });
            const alreadyHasRole = userData?.ROLES?.some(
              (r) => r.ROLEID === newRoleId
            );
            if (alreadyHasRole) {
              return {
                error: true,
                message: `El usuario ya tiene asignado el ROLEID '${newRoleId}'.`,
              };
            }

            // Agrega el nuevo rol
            await mongoose.connection.collection("ZTUSERS").updateOne(
              { USERID: userid },
              {
                $push: {
                  ROLES: {
                    ROLEID: newRoleData.ROLEID,
                  },
                },
              }
            );
          }

          return {
            message: `El usuario '${userid}' fue actualizado correctamente.`,
          };
        } catch (error) {
          throw new Error(error.message);
        }
      default:
        throw new Error(
          "Acción no válida. Las acciones permitidas son: get, create y update."
        );
    }
  } catch (error) {
    console.error("Error en CrudUsers:", error.message);
    throw new Error(error.message);
  }
}

// Servicio para eliminar un registro de la colección correspondiente (por query params)

async function DeleteRecord(req) {
  try {
    // Extraer los parámetros del request
    const { roleid, valueid, labelid, userid, borrado } = req?.req?.query || {};

    // Validación: al menos un ID debe estar presente
    if (!labelid && !userid && !roleid && !valueid) {
      throw new Error("Se debe proporcionar al menos un ID para eliminar");
    }
    console.log("borrado", userid);
    const currentDate = new Date();

    // Función para marcar como eliminado según tipo (lógico o físico)
    const deleteFromCollection = async (collection, fieldName, value) => {
      const filter = { [fieldName]: value };
      // Campos a modificar según el tipo de eliminación
      const updateFields = {
        "DETAIL_ROW.ACTIVED": false,
        "DETAIL_ROW.DELETED": true,
      };

      if (borrado !== "fisic") {
        updateFields["DETAIL_ROW.DELETED"] = false;
      }

      const result = await mongoose.connection
        .collection(collection)
        .updateOne(filter, { $set: updateFields });

      if (result.modifiedCount === 0) {
        throw new Error(
          `No se pudo actualizar el registro en la colección ${collection}`
        );
      }

      return {
        message: `Registro marcado como eliminado ${
          borrado === "fisic" ? "físicamente" : "lógicamente"
        } en la colección ${collection}`,
      };
    };

    // Lógica según qué ID se proporciona (usa claves personalizadas en mayúsculas)
    if (labelid)
      return await deleteFromCollection("ZTLABELS", "LABELID", labelid);
    if (userid) return await deleteFromCollection("ZTUSERS", "USERID", userid);
    if (roleid) return await deleteFromCollection("ZTROLES", "ROLEID", roleid);
    if (valueid)
      return await deleteFromCollection("ZTVALUES", "VALUEID", valueid);
  } catch (error) {
    console.error("Error al eliminar el registro:", error.message);
    throw error;
  }
}

async function CrudValues(req) {
  try {
    const action = req.req.query.action;

    if (!action) {
      throw new Error("El parámetro 'action' es obligatorio.");
    }

    switch (action) {
      case "get":
        try {
          const labelid = req?.req?.query?.labelid;
          const valueid = req?.req?.query?.valueid;

          let result;

          if (!labelid && !valueid) {
            // Caso 1: No hay labelid ni valueid
            result = await mongoose.connection
            .collection("ZTVALUES") // ✅ Cambiado a la colección correcta
            .aggregate([
              {
                $match: {
                  "DETAIL_ROW.ACTIVED": true, // Filtra los valores activos
                },
              },
            ])
            .toArray();
          } else if (labelid && !valueid) {
            // Caso 2: Solo hay labelid
            result = await mongoose.connection
              .collection("ZTLABELS")
              .aggregate([
                {
                  $match: { LABELID: labelid },
                },
                {
                  $lookup: {
                    from: "ZTVALUES",
                    localField: "LABELID",
                    foreignField: "LABELID",
                    as: "VALUES",
                  },
                },
                {
                  $addFields: {
                    VALUES: {
                      $filter: {
                        input: "$VALUES",
                        as: "val",
                        cond: { $eq: ["$$val.DETAIL_ROW.ACTIVED", true] },
                      },
                    },
                  },
                },
              ])
              .toArray();
          } else if (labelid && valueid) {
            // Caso 3: Hay labelid y valueid
            result = await mongoose.connection
              .collection("ZTLABELS")
              .aggregate([
                {
                  $match: { LABELID: labelid },
                },
                {
                  $lookup: {
                    from: "ZTVALUES",
                    localField: "LABELID",
                    foreignField: "LABELID",
                    as: "VALUES",
                  },
                },
                {
                  $addFields: {
                    VALUES: {
                      $filter: {
                        input: "$VALUES",
                        as: "val",
                        cond: {
                          $and: [
                            { $eq: ["$$val.VALUEID", valueid] },
                            { $eq: ["$$val.DETAIL_ROW.ACTIVED", true] },
                          ],
                        },
                      },
                    },
                  },
                },
              ])
              .toArray();
          }

          return result;
        } catch (error) {
          console.error("Error en la agregación con $lookup:", error.message);
          throw error;
        }

      case "create":
        try {
          const {
            COMPANYID,
            CEDIID,
            LABELID,
            VALUEPAID,
            VALUEID,
            VALUE,
            ALIAS,
            SEQUENCE,
            IMAGE,
            VALUESAPID,
            DESCRIPTION,
            ROUTE,
            ACTIVED = true,
            DELETED = false,
            reguser,
          } = req?.req?.body?.values;

          const currentDate = new Date();

          const detailRowReg = [
            {
              CURRENT: false,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
            {
              CURRENT: true,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
          ];

          const validLabels = [
            "IdApplications",
            "IdViews",
            "IdProcesses",
            "IdRoles",
            "IdPrivileges",
          ];

          if (!validLabels.includes(LABELID)) {
            throw new Error(
              `LABELID debe ser uno de los siguientes: ${validLabels.join(
                ", "
              )}`
            );
          }

          // Verificar si ya existe un VALUEID en la colección
          const valueExists = await mongoose.connection
            .collection("ZTVALUES")
            .findOne({ VALUEID });

          if (valueExists) {
            throw new Error(`Ya existe un registro con VALUEID "${VALUEID}".`);
          }

          if (LABELID === "IdApplications" && VALUEPAID) {
            throw new Error(
              "VALUEPAID debe estar vacío cuando LABELID es IdApplications, ya que no tiene padre."
            );
          }

          if (LABELID !== "IdApplications") {
            const labelIndex = validLabels.indexOf(LABELID);
            const parentLabel = validLabels[labelIndex - 1];

            const regex = new RegExp(`^${parentLabel}-[A-Za-z0-9]+$`);
            if (!regex.test(VALUEPAID)) {
              throw new Error(
                `VALUEPAID debe seguir el formato "${parentLabel}-<IdRegistro>" sin espacios alrededor del guion.`
              );
            }

            const parentId = VALUEPAID.split("-")[1];
            const parentExists = await mongoose.connection
              .collection("ZTVALUES")
              .findOne({ LABELID: parentLabel, VALUEID: parentId });

            if (!parentExists) {
              throw new Error(
                `El ID padre especificado (${parentId}) no existe en la colección ZTVALUES como ${parentLabel}.`
              );
            }
          }

          const newZTValue = {
            COMPANYID,
            CEDIID,
            LABELID: LABELID || "",
            VALUEPAID: VALUEPAID || "",
            VALUEID: VALUEID || "",
            VALUE: VALUE || "",
            ALIAS: ALIAS || "",
            SEQUENCE: SEQUENCE || 0,
            IMAGE: IMAGE || "",
            VALUESAPID: VALUESAPID || "",
            DESCRIPTION: DESCRIPTION || "",
            ROUTE: ROUTE || "",
            DETAIL_ROW: {
              ACTIVED,
              DELETED,
              DETAIL_ROW_REG: detailRowReg,
            },
          };

          const result = await mongoose.connection
            .collection("ZTVALUES")
            .insertOne(newZTValue);

          return {
            message: "ZTValue creado exitosamente",
            ztvalueId: newZTValue,
          };
        } catch (error) {
          throw new Error(error.message);
        }

      case "update":
        try {
          // Obtener VALUEID desde los query parameters
          const { valueid } = req?.req?.query;

          if (!valueid) {
            throw new Error(
              "El parámetro VALUEID es obligatorio para realizar la actualización."
            );
          }

          // Desestructuración de las propiedades del body
          const {
            LABELID,
            VALUEPAID,
            VALUE,
            ALIAS,
            SEQUENCE,
            IMAGE,
            VALUESAPID,
            DESCRIPTION,
            ROUTE,
            ACTIVED,
            DELETED,
            reguser,
          } = req?.req?.body?.values || {};

          const currentDate = new Date();

          // Consultar el registro actual basado en VALUEID
          const existingRecord = await mongoose.connection
            .collection("ZTVALUES")
            .findOne({ VALUEID: valueid });

          if (!existingRecord) {
            throw new Error(
              `No se encontró un registro con el VALUEID: ${valueid}`
            );
          }

          // Obtener LABELID actual del registro si no se proporciona en el body
          const currentLabelId = LABELID || existingRecord.LABELID;

          // Validaciones (similar a CreateValue)
          const validLabels = [
            "IdApplications",
            "IdViews",
            "IdProcesses",
            "IdRoles",
            "IdPrivileges",
          ];

          if (!validLabels.includes(currentLabelId)) {
            throw new Error(
              `LABELID debe ser uno de los siguientes: ${validLabels.join(
                ", "
              )}`
            );
          }

          if (currentLabelId === "IdApplications" && VALUEPAID) {
            throw new Error(
              "VALUEPAID debe estar vacío cuando LABELID es IdApplications, ya que no tiene padre."
            );
          }

          if (currentLabelId !== "IdApplications" && VALUEPAID) {
            const labelIndex = validLabels.indexOf(currentLabelId);
            const parentLabel = validLabels[labelIndex - 1]; // El padre del LABELID actual

            // Verificar el formato de VALUEPAID (sin espacios alrededor del guion)
            const regex = new RegExp(`^${parentLabel}-[A-Za-z0-9]+$`);
            if (!regex.test(VALUEPAID)) {
              throw new Error(
                `VALUEPAID debe estar en el formato "${parentLabel}-<IdRegistro>" sin espacios alrededor del guion.`
              );
            }

            // Verificar la existencia del ID padre en la colección
            const parentId = VALUEPAID.split("-")[1];
            const parentExists = await mongoose.connection
              .collection("ZTVALUES")
              .findOne({ LABELID: parentLabel, VALUEID: parentId });

            if (!parentExists) {
              throw new Error(
                `El ID padre especificado (${parentId}) no existe en la colección ZTVALUES como ${parentLabel}.`
              );
            }
          }

          // Construcción dinámica del objeto de actualización
          const updateFields = {};
          if (LABELID) updateFields.LABELID = LABELID;
          if (VALUEPAID) updateFields.VALUEPAID = VALUEPAID;
          if (VALUE) updateFields.VALUE = VALUE;
          if (ALIAS) updateFields.ALIAS = ALIAS;
          if (SEQUENCE !== undefined) updateFields.SEQUENCE = SEQUENCE;
          if (IMAGE) updateFields.IMAGE = IMAGE;
          if (VALUESAPID) updateFields.VALUESAPID = VALUESAPID;
          if (DESCRIPTION) updateFields.DESCRIPTION = DESCRIPTION;
          if (ROUTE) updateFields.ROUTE = ROUTE;
          if (ACTIVED !== undefined)
            updateFields["DETAIL_ROW.ACTIVED"] = ACTIVED;
          if (DELETED !== undefined)
            updateFields["DETAIL_ROW.DELETED"] = DELETED;

          updateFields["DETAIL_ROW_REG"] = [
            {
              CURRENT: false,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser || "",
            },
            {
              CURRENT: true,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser || "",
            },
          ];

          // Realizar la actualización en la colección
          const result = await mongoose.connection
            .collection("ZTVALUES")
            .updateOne({ VALUEID: valueid }, { $set: updateFields });

          if (result.modifiedCount === 0) {
            throw new Error(
              "No se encontró el registro con el VALUEID proporcionado o no se realizó la actualización."
            );
          }

          return {
            message: "ZTValue actualizado exitosamente",
            updatedFields: updateFields,
          };
        } catch (error) {
          throw new Error(error.message);
        }
      default:
        throw new Error(
          "Acción no válida. Las acciones permitidas son: create y update."
        );
    }
  } catch (error) {
    console.error("Error en CrudValues:", error.message);
    throw new Error(error.message);
  }
}

async function CrudRoles(req) {
  try {
    const action = req.req.query.action;
    const roleid = req.req.query?.roleid;

    if (!action) {
      throw new Error("El parámetro 'action' es obligatorio.");
    }

    switch (action) {
      case "create":
        try {
          const {
            ROLEID,
            ROLENAME,
            DESCRIPTION,
            PRIVILEGES,
            ACTIVED = true,
            DELETED = false,
            reguser,
          } = req.data.roles;

          if (!ROLEID || !ROLENAME || !Array.isArray(PRIVILEGES)) {
            return req.error(400, "Datos incompletos o inválidos");
          }

          const exists = await mongoose.connection
            .collection("ZTROLES")
            .findOne({ ROLEID });

          if (exists) {
            throw new Error(`Ya existe un rol con el ID ${ROLEID}`);
          }

          const currentDate = new Date();

          // Sección para DETAIL_ROW_REG
          const detailRow = [
            {
              CURRENT: false,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
            {
              CURRENT: true,
              REGDATE: currentDate,
              REGTIME: currentDate,
              REGUSER: reguser,
            },
          ];
          const newRole = {
            ROLEID,
            ROLENAME,
            DESCRIPTION: DESCRIPTION || "",
            PRIVILEGES,
            DETAIL_ROW: {
              ACTIVED,
              DELETED,
              DETAIL_ROW_REG: detailRow,
            },
          };
          await mongoose.connection.collection("ZTROLES").insertOne(newRole);
          return { message: "Rol creado exitosamente", role: newRole };
        } catch (error) {
          throw new Error(error.message);
        }
        case "update":
          try {
            const { roleid } = req?.req?.query;
            const { ROLENAME, DESCRIPTION, PRIVILEGES } = req.data.roles;
        
            if (!roleid) {
              throw new Error("El parámetro ROLEID en query es obligatorio para actualizar");
            }
        
            const collection = mongoose.connection.collection("ZTROLES");
        
            const exists = await collection.findOne({ ROLEID: roleid });
        
            if (!exists) {
              return req.error(404, `No se encontró un rol con el ID ${roleid}`);
            }
        
            const updatedFields = {};
        
            if (ROLENAME) updatedFields.ROLENAME = ROLENAME;
            if (DESCRIPTION) updatedFields.DESCRIPTION = DESCRIPTION;
            if (Array.isArray(PRIVILEGES)) updatedFields.PRIVILEGES = PRIVILEGES;
        
            if (Object.keys(updatedFields).length === 0) {
              throw new Error("No se proporcionaron campos válidos para actualizar");
            }
        
            await collection.updateOne({ ROLEID: roleid }, { $set: updatedFields });
        
            const updatedRole = await collection.findOne({ ROLEID: roleid });
        
            return {
              message: "Rol actualizado exitosamente",
              role: updatedRole,
            };
          } catch (error) {
            throw new Error(error.message);
          }
      
      case "get":
        try {
          const { roleid } = req?.req?.query;

          const pipeline = [];

          // Filtro por ROLEID si se especifica
          if (roleid) {
            pipeline.push({ $match: { ROLEID: roleid } });
          }

          // Filtrar los que estén activos
          pipeline.push({ $match: { "DETAIL_ROW.ACTIVED": true } });

          pipeline.push(
            { $unwind: "$PRIVILEGES" },
            {
              $lookup: {
                from: "ZTVALUES",
                let: { processId: "$PRIVILEGES.PROCESSID" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          { $concat: ["IdProcess-", "$VALUEID"] },
                          "$$processId",
                        ],
                      },
                    },
                  },
                  {
                    $lookup: {
                      from: "ZTVALUES",
                      let: { viewId: "$VALUEPAID" },
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $eq: [
                                { $concat: ["IdViews-", "$VALUEID"] },
                                "$$viewId",
                              ],
                            },
                          },
                        },
                        {
                          $lookup: {
                            from: "ZTVALUES",
                            let: { appId: "$VALUEPAID" },
                            pipeline: [
                              {
                                $match: {
                                  $expr: {
                                    $eq: [
                                      {
                                        $concat: [
                                          "IdApplications-",
                                          "$VALUEID",
                                        ],
                                      },
                                      "$$appId",
                                    ],
                                  },
                                },
                              },
                            ],
                            as: "applicationDetails",
                          },
                        },
                        {
                          $addFields: {
                            applicationInfo: {
                              $arrayElemAt: ["$applicationDetails", 0],
                            },
                          },
                        },
                      ],
                      as: "viewDetails",
                    },
                  },
                  {
                    $addFields: {
                      viewInfo: { $arrayElemAt: ["$viewDetails", 0] },
                    },
                  },
                ],
                as: "processDetails",
              },
            },
            {
              $addFields: {
                processInfo: { $arrayElemAt: ["$processDetails", 0] },
              },
            },
            {
              $group: {
                _id: "$ROLEID",
                ROLEID: { $first: "$ROLEID" },
                ROLENAME: { $first: "$ROLENAME" },
                DESCRIPTION: { $first: "$DESCRIPTION" },
                PROCESSES: {
                  $push: {
                    PROCESSID: "$PRIVILEGES.PROCESSID",
                    PROCESSNAME: "$processInfo.VALUE",
                    VIEWID: "$processInfo.viewInfo.VALUEID",
                    VIEWNAME: "$processInfo.viewInfo.VALUE",
                    APPLICATIONID:
                      "$processInfo.viewInfo.applicationInfo.VALUEID",
                    APPLICATIONNAME:
                      "$processInfo.viewInfo.applicationInfo.VALUE",
                    PRIVILEGES: {
                      $map: {
                        input: "$PRIVILEGES.PRIVILEGEID",
                        as: "privId",
                        in: {
                          PRIVILEGEID: "$$privId",
                          PRIVILEGENAME: "$$privId",
                        },
                      },
                    },
                  },
                },
                DETAIL_ROW: { $first: "$DETAIL_ROW" },
              },
            },
            {
              $project: {
                _id: 0,
                ROLEID: 1,
                ROLENAME: 1,
                DESCRIPTION: 1,
                PROCESSES: 1,
                DETAIL_ROW: 1,
              },
            }
          );

          const result = await mongoose.connection
            .collection("ZTROLES")
            .aggregate(pipeline)
            .toArray();

          return result;
        } catch (error) {
          throw new Error(error.message);
        }

      // Servicio para obtener usuarios con sus roles
      case "getUsByRo":
        try {
          const { roleid } = req.req.query;

          if (!roleid) {
            throw new Error("No se proporcinó el ID del usuario");
          }

          const pipeline = [
            { $unwind: "$ROLES" },
            ...(roleid ? [{ $match: { "ROLES.ROLEID": roleid } }] : []), // filtro dinámico
            {
              $lookup: {
                from: "ZTROLES",
                localField: "ROLES.ROLEID",
                foreignField: "ROLEID",
                as: "roleDetail",
              },
            },
            {
              $addFields: {
                roleInfo: {
                  ROLEID: "$ROLES.ROLEID",
                  ROLENAME: { $arrayElemAt: ["$roleDetail.ROLENAME", 0] },
                  DESCRIPTION: { $arrayElemAt: ["$roleDetail.DESCRIPTION", 0] },
                },
              },
            },
            {
              $group: {
                _id: "$_id",
                userData: { $first: "$$ROOT" },
                roles: { $push: "$roleInfo" },
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: ["$userData", { ROLES: "$roles" }],
                },
              },
            },
            {
              $project: {
                roleDetail: 0,
                roleInfo: 0,
                "userData.ROLES": 0,
              },
            },
          ];

          const result = await mongoose.connection
            .collection("ZTUSERS")
            .aggregate(pipeline)
            .toArray();

          return result;
        } catch (error) {
          throw new Error(error.message);
        }

      default:
        throw new Error(
          "Acción no válida. Las acciones permitidas son: create, update, getRoles y getUserRoles."
        );
    }
  } catch (error) {
    console.error("Error en CrudValues:", error.message);
    throw new Error(error.message);
  }
}

module.exports = {
  DeleteRecord,
  CrudUsers,
  CrudValues,
  CrudRoles,
};
