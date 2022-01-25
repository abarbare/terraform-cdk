package main

import (
	"os"

	"github.com/aws/constructs-go/constructs/v10"
	"github.com/aws/jsii-runtime-go"
	"github.com/hashicorp/terraform-cdk-go/cdktf"
	"github.com/hashicorp/terraform-cdk/examples/go/ucloud/generated/ucloud/ucloud"
)

func NewMyStack(scope constructs.Construct, id string) cdktf.TerraformStack {
	stack := cdktf.NewTerraformStack(scope, &id)

	ucloud.NewUcloudProvider(stack, jsii.String("ucloud"), &ucloud.UcloudProviderConfig{
		Region:    jsii.String("cn-bj2"),
		ProjectId: jsii.String(os.Getenv("UCLOUD_PROJECT_ID")),
	})

	images := ucloud.NewDataUcloudImages(stack, jsii.String("images"), &ucloud.DataUcloudImagesConfig{
		AvailabilityZone: jsii.String("cn-bj2-04"),
		NameRegex:        jsii.String("^CentOS 8.2 64"),
		ImageType:        jsii.String("base"),
	})

	ucloud.NewInstance(stack, jsii.String("web"), &ucloud.InstanceConfig{
		AvailabilityZone: jsii.String("cn-bj2-04"),
		ImageId:          cdktf.Token_AsString(cdktf.Fn_Lookup(cdktf.Fn_Element(images.Images, 0), jsii.String("id"), jsii.String("")), &cdktf.EncodingOptions{}),
		InstanceType:     jsii.String("n-basic-2"),
		RootPassword:     jsii.String("wA1234567"),
		Name:             jsii.String("cdktf-example-instance"),
		Tag:              jsii.String("tf-example"),
		BootDiskType:     jsii.String("cloud_ssd"),
	})
	return stack
}

func main() {
	app := cdktf.NewApp(nil)

	NewMyStack(app, "go-ucloud")

	app.Synth()
}
