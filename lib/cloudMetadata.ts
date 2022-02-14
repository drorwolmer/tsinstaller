import axios from "axios";
import * as fs from "fs";
import { ValidateFunction } from "ajv";

const REQUEST_TIMEOUT = 10 * 1000;

export const awsMetadata = async <T>(schemaValidator: ValidateFunction) => {
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

    if (schemaValidator(response.data)) {
      return response.data;
    } else {
      console.log("false" + JSON.stringify(schemaValidator.errors));
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
};

export const azureMetadata = async <T>(schemaValidator: ValidateFunction) => {
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

    if (schemaValidator(userdata)) {
      return userdata;
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
};

export const gcpMetadata = async <T>(schemaValidator: ValidateFunction) => {
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

    if (schemaValidator(userdata)) {
      return userdata;
    }

    return undefined;
  } catch (e) {
    return undefined;
  }
};

export const getMetadataObject = async <T>(
  schemaValidator: ValidateFunction
) => {
  const awsData = await awsMetadata<T>(schemaValidator);
  if (awsData) {
    return awsData;
  }

  const azureData = await azureMetadata<T>(schemaValidator);
  if (azureData) {
    return azureData;
  }

  const gcpData = await gcpMetadata<T>(schemaValidator);
  if (gcpData) {
    return gcpData;
  }

  return undefined;
};
