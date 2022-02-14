import axios from "axios";
import * as fs from "fs";

const REQUEST_TIMEOUT = 10 * 1000;

export const awsMetadata = async <T>() => {
  try {
    const token = await axios.put<string>(
      `http://169.254.169.254/latest/api/token`,
      {},
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "X-aws-ec2-metadata-token-ttl-seconds": "21600",
        },
      }
    );

    const response = await axios.get<T>(
      "http://169.254.169.254/latest/user-data",
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "X-aws-ec2-metadata-token": token.data,
        },
      }
    );

    return response.data;
  } catch (e) {
    return undefined;
  }
};

export const azureMetadata = async <T>() => {
  try {
    if (!fs.existsSync(`/var/lib/waagent/CustomData`)) {
      return undefined;
    }
    const content = await fs.promises.readFile(
      `/var/lib/waagent/CustomData`,
      "base64"
    );
    const buff = Buffer.from(content, "base64");
    const userdata = JSON.parse(buff.toString("utf-8")) as T;

    return userdata;
  } catch (e) {
    return undefined;
  }
};

export const gcpMetadata = async <T>() => {
  let response;
  try {
    response = await axios.get<string>(
      "http://metadata.google.internal/computeMetadata/v1/instance/attributes/customData",
      {
        timeout: REQUEST_TIMEOUT,
        headers: { "Metadata-Flavor": "Google" },
      }
    );
    const buff = Buffer.from(response.data, "base64");
    const userdata = JSON.parse(buff.toString("utf-8")) as T;

    return userdata;
  } catch (e) {
    return undefined;
  }
};

export const getMetadataObject = async <T>() => {
  const awsData = await awsMetadata<T>();
  if (awsData) {
    return awsData;
  }

  const azureData = await azureMetadata<T>();
  if (azureData) {
    return azureData;
  }

  const gcpData = await gcpMetadata<T>();
  if (gcpData) {
    return gcpData;
  }

  return undefined;
};
