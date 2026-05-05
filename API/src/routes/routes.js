import {Router} from "express";

import {
    initialPage,
    insertCompany, 
    getCompanyByToken,
    loginCompany,
    loginAreaByCompany,
    getAllByToken
} from "../controllers/controller.js"

import {
    authentication, 
    onlyCompanyAuth, 
    onlyIntParam
} from "../middleware/middleware.js"

const routes = Router();

//GETs
routes.get("/", initialPage);
routes.post('/', initialPage)

//PUTS
routes.put('/company', insertCompany)


routes.post('/loginCompany', loginCompany)
routes.post('/loginArea', onlyCompanyAuth, loginAreaByCompany)

routes.get('/companyToken', onlyCompanyAuth, getCompanyByToken)
routes.get('/allToken', authentication, getAllByToken)


export default routes;