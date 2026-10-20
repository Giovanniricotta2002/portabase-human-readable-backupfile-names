import {EDbmsSchema} from "@/db/schema/types";

export type databaseAgent = {
    name: string;
    dbms: EDbmsSchema;
    generatedId: string;
    pingStatus: boolean;
    method?: string;
};

export type Body = {
    version: string;
    databases: databaseAgent[];
};
