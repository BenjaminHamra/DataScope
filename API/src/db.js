import pg from 'pg';

export const pool=new pg.Pool({
    user: "postgres",
    host: "localhost",
    password: "root",
    database: "DataScope",
    port: 5432
})

//en esta parte probablemente haya que cambiar cosas cuando corra en el colegio

//colegio:
//user: postgres
//password: root