import { DeepBaseType } from "../../generator";
import { client } from "../../redis";

export const setCache = async (
    secret: string,
    data: DeepBaseType,
    time = 300
) =>
    client.setEx(secret, time, JSON.stringify(data));

export const getCache =async (secret: string) => client.get(secret);

export const checkCache = async (secret: string) => client.exists(secret);