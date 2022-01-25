import { TestDriver, onPosix } from "../../test-helper";
import { TerraformCloud } from "@skorfmann/terraform-cloud";
import * as crypto from "crypto";
import express from "express";
import proxy from "express-http-proxy";

const { TERRAFORM_CLOUD_TOKEN, GITHUB_RUN_NUMBER, TERRAFORM_VERSION } =
  process.env;
const withAuth = TERRAFORM_CLOUD_TOKEN ? onPosix : it.skip;

if (!TERRAFORM_CLOUD_TOKEN) {
  console.log("TERRAFORM_CLOUD_TOKEN is undefined, skipping authed tests");
}

function startHttpProxy(
  target: string,
  mock: jest.Mock
): Promise<{
  address: string;
  close: () => void;
}> {
  return new Promise((resolve) => {
    const app = express();
    app.use(
      "/",
      proxy(target, {
        filter: (req) => {
          // We use this as it's called for every request
          mock(req);
          return true;
        },
      })
    );
    const listener = app.listen(() => {
      resolve({
        address: listener.address().toString(),
        close: () => listener.close(),
      });
    });
  });
}

// Below tests are disabled on windows because they fail due to networking issues
describe("full integration test", () => {
  let driver: TestDriver;
  let workspaceName: string;
  const orgName = "cdktf";

  beforeEach(async () => {
    workspaceName = `${GITHUB_RUN_NUMBER}-${crypto
      .randomBytes(10)
      .toString("hex")}`;
    driver = new TestDriver(__dirname, {
      TERRAFORM_CLOUD_WORKSPACE_NAME: workspaceName,
      TERRAFORM_CLOUD_ORGANIZATION: orgName,
    });
    await driver.setupTypescriptProject();
    driver.copyFolders("fixtures");
  });

  withAuth("deploy in Terraform Cloud", async () => {
    const client = new TerraformCloud(TERRAFORM_CLOUD_TOKEN);

    await client.Workspaces.create(orgName, {
      data: {
        attributes: {
          name: workspaceName,
          executionMode: "remote",
          terraformVersion: TERRAFORM_VERSION,
        },
        type: "workspaces",
      },
    });

    expect(driver.deploy("source-stack")).toMatchSnapshot();
    await client.Workspaces.deleteByName(orgName, workspaceName);
  });

  withAuth("deploy locally and then in Terraform Cloud", async () => {
    const client = new TerraformCloud(TERRAFORM_CLOUD_TOKEN);

    await client.Workspaces.create(orgName, {
      data: {
        attributes: {
          name: workspaceName,
          executionMode: "remote",
          terraformVersion: TERRAFORM_VERSION,
        },
        type: "workspaces",
      },
    });

    process.env.TF_EXECUTE_LOCAL = "true";
    driver.deploy("source-stack");
    process.env.TF_EXECUTE_LOCAL = undefined;
    driver.deploy("source-stack");

    await client.Workspaces.deleteByName(orgName, workspaceName);
  });

  // Only the origin stack is in TFC, the consumer stack is local
  withAuth(
    "deploy with cross stack reference origin in Terraform Cloud",
    async () => {
      const client = new TerraformCloud(TERRAFORM_CLOUD_TOKEN);

      await client.Workspaces.create(orgName, {
        data: {
          attributes: {
            name: workspaceName,
            executionMode: "remote",
            terraformVersion: TERRAFORM_VERSION,
          },
          type: "workspaces",
        },
      });

      driver.deploy("source-stack");
      driver.deploy("consumer-stack");

      await client.Workspaces.deleteByName(orgName, workspaceName);

      expect(driver.readLocalFile("origin-file.txt")).toEqual(
        driver.readLocalFile("consumer-file.txt")
      );
    }
  );

  withAuth("deploy through HTTP_PROXY in Terraform Cloud", async () => {
    const client = new TerraformCloud(TERRAFORM_CLOUD_TOKEN);

    await client.Workspaces.create(orgName, {
      data: {
        attributes: {
          name: workspaceName,
          executionMode: "remote",
          terraformVersion: TERRAFORM_VERSION,
        },
        type: "workspaces",
      },
    });
    const proxyCalls = jest.fn();
    const { close, address } = await startHttpProxy(
      "https://app.terraform.io/api/v2",
      proxyCalls
    );

    process.env.HTTP_PROXY = address;
    // Run deploy command
    driver.deploy("source-stack");
    process.env.HTTP_PROXY = undefined;
    close();

    await client.Workspaces.deleteByName(orgName, workspaceName);
    expect(proxyCalls).toHaveBeenCalled();
  });
});
