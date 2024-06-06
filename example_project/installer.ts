import {
  createArchive,
  InstallerFn,
  saveDockerImagesToFile,
  SelfExtractingInstaller,
  verifyDockerVersion,
  verifyDockerComposeVersion,
  loadDockerImages,
  untar,
  startInstaller,
  RequiredUrl,
  verifyAllUrls,
  verifyRoot,
  verifyLinuxServiceEnabled,
  Step,
  InstallerStepFn,
  getCompileTimeVariable,
  setEnvFileStep,
} from "../lib";

const PART__DOCKER_IMAGES = "docker_images";
const PART__INSTALL_FILES = "install_files";
const TMP_DOCKER_TAR = "/tmp/foo.tar.gz";

export const fooStep: InstallerStepFn = async () => {
  return {
    success: true,
  };
};

// Docker endpoints taken from https://superuser.com/questions/1521114/list-of-domains-required-to-pull-docker-image
export const REQUIRED_URLS: RequiredUrl[] = [
  {
    url: "https://index.docker.io",
    expectedStatus: [200],
  },
  {
    url: "https://registry-1.docker.io/v2/",
    expectedStatus: [401],
  },
  {
    url: "https://auth.docker.io",
    expectedStatus: [404],
  },
  {
    url: "https://dseasb33srnrn.cloudfront.net/",
    expectedStatus: [403],
  },
  {
    url: "https://production.cloudflare.docker.com/",
    expectedStatus: [403],
  },
];

export const compileSteps: InstallerFn = async (
  installer: SelfExtractingInstaller
) => {
  // ===============================================================
  console.info("[+] Saving docker images to file");
  await saveDockerImagesToFile(__dirname, TMP_DOCKER_TAR);
  await installer.addFile(TMP_DOCKER_TAR, PART__DOCKER_IMAGES);
  // ===============================================================
  console.info("[+] Adding install files to installer...");
  await createArchive(TMP_DOCKER_TAR, __dirname, ["docker-compose.yml"]);
  await installer.addFile(TMP_DOCKER_TAR, PART__INSTALL_FILES);
};

export const installSteps = (): Step[] => [
  {
    title: "Verifying root permissions",
    f: verifyRoot,
  },
  { title: "Verifying Docker version", f: verifyDockerVersion("19.3.1") },
  {
    title: "Verifying docker-compose version",
    f: verifyDockerComposeVersion("1.29.2"),
  },
  {
    title: "Verify Docker service is enabled",
    f: verifyLinuxServiceEnabled("docker"),
  },
  {
    title: "Verifying network prerequesties",
    f: verifyAllUrls(REQUIRED_URLS),
  },
  { title: "Loading Docker Images", f: loadDockerImages(PART__DOCKER_IMAGES) },
  {
    title: "Extracting installation files",
    f: untar(PART__INSTALL_FILES, "/tmp/tsinstaller_example/"),
  },
  {
    title: "Set env variables",
    f: setEnvFileStep("/tmp/tsinstaller_example/.env.txt", {
      FOO: getCompileTimeVariable("FOO") || "bar",
    }),
  },
];

if (require.main === module) {
  startInstaller(installSteps());
}
