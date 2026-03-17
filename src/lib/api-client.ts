import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

export const apiRequest = async <T>(
  route: string,
  method: HttpMethod,
  body?: any,
): Promise<T> => {
  const response = await apiClient({
    url: route,
    method,
    data: body,
  });

  return response.data as T;
};
