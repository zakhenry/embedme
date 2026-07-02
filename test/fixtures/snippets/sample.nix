{ pkgs, lib, config, ... }:
{
  options.message = lib.mkOption {
    type = lib.types.str;
    default = "Hello World";
  };
  config.packages.default = pkgs.writeShellApplication {
    name = "hello-message";
    text = "echo ${lib.escapeShellArg config.message}";
  };
}
