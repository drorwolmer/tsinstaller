import axios from "axios";
import fs from "fs";

const REQUEST_TIMEOUT = 2 * 1000;

export const fetchAwsCustomMetadata = async <T>() => {
  try {
    const tokenResponse = await axios.put<string>(
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
          "X-aws-ec2-metadata-token": tokenResponse.data,
        },
      }
    );

    return response.data;
  } catch (e) {
    return undefined;
  }
};

export const fetchAzureCustomMetadata = async <T>() => {
  try {
    if (!fs.existsSync(`/var/lib/waagent/CustomData`)) {
      return undefined;
    }
    const content = await fs.promises.readFile(`/var/lib/waagent/CustomData`, {
      encoding: "utf-8",
    });
    const buff = Buffer.from(content, "base64");
    const userdata = JSON.parse(buff.toString("utf-8")) as T;

    return userdata;
  } catch (e) {
    return undefined;
  }
};

export const fetchGcpCustomMetadata = async <T>() => {
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

export const getCustomMetadata = async <T>() => {
  const [awsData, azureData, gcpData] = await Promise.all([
    fetchAwsCustomMetadata<T>(),
    fetchAzureCustomMetadata<T>(),
    fetchGcpCustomMetadata<T>(),
  ]);
  if (awsData) {
    return awsData;
  }
  if (azureData) {
    return azureData;
  }
  if (gcpData) {
    return gcpData;
  }

  return undefined;
};
