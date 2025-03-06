{ pkgs, ... }:
pkgs.mkShell {
  packages = [
    pkgs.pnpm
  ];
}
