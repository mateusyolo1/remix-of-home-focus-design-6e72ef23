export const HERMES_DOCS_URL = "https://hermes-agent.nousresearch.com/docs/getting-started/termux";

export const HERMES_QUICK_INSTALL = `curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash`;

export const HERMES_MANUAL_INSTALL = `pkg update
pkg install -y git python clang rust make pkg-config libffi openssl nodejs ripgrep ffmpeg
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent
python -m venv venv
source venv/bin/activate
export ANDROID_API_LEVEL="$(getprop ro.build.version.sdk)"
python -m pip install --upgrade pip setuptools wheel
python -m pip install -e '.[termux]' -c constraints-termux.txt
ln -sf "$PWD/venv/bin/hermes" "$PREFIX/bin/hermes"`;

export const HERMES_VERIFY = `hermes version`;
export const HERMES_DOCTOR = `hermes doctor`;
export const HERMES_RUN = `hermes`;
export const HERMES_MODEL_SETUP = `hermes model
# ou
hermes setup`;
