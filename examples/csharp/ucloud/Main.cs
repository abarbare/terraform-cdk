using System;
using System.Collections.Generic;
using System.Linq;
using ucloud;
using Constructs;
using HashiCorp.Cdktf;


namespace MyCompany.MyApp
{
    class MyApp : TerraformStack
    {
        public MyApp(Construct scope, string id) : base(scope, id)
        {
            new UcloudProvider(this, "ucloud", new UcloudProviderConfig {
                Region = "cn-bj2",
                ProjectId = System.Environment.GetEnvironmentVariable("UCLOUD_PROJECT_ID") ?? "",
            });

            DataUcloudImages images = new DataUcloudImages(this, "images", new DataUcloudImagesConfig {
	        AvailabilityZone = "cn-bj2-04",
                NameRegex        = "^CentOS 8.2 64",
                ImageType        = "base",	    
            });

	    new Instance(this, "web", new InstanceConfig {
                AvailabilityZone = "cn-bj2-04",
                ImageId = Fn.Lookup(Fn.Element(images, 0), "id", ""),
                InstanceType = "n-basic-2",
                RootPassword = "wA1234567",
                Name = "cdktf-example-instance",
                Tag = "tf-example",
                BootDiskType = "cloud_ssd",
            });
        }

        public static void Main(string[] args)
        {
            App app = new App();
            new MyApp(app, "ucloud");
            app.Synth();
            Console.WriteLine("App synth complete");
        }
    }
}
