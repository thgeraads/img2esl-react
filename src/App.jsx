import 'mdui/mdui.css';
import 'mdui/components/switch.js';
import 'mdui/components/button.js';
import 'mdui/components/slider.js';
import 'mdui/components/dropdown.js';
import 'mdui/components/menu.js';
import 'mdui/components/menu-item.js';
import 'mdui/components/checkbox.js';
import 'mdui/components/circular-progress.js';
import 'mdui/components/top-app-bar.js';


function App() {
    return (
        <div id={"container"}>
            <div id={'control-panel'}>
                <h2 id='control-panel-title'>ESL Image Uploader</h2>
                <mdui-button id={"image-upload-button"}>Select Image</mdui-button>
                <mdui-dropdown id={"display-dropdown"}>
                    <mdui-button slot="trigger">Select display type</mdui-button>
                    <mdui-menu>
                        <mdui-menu-item>MN@ (122x250)</mdui-menu-item>
                        <mdui-menu-item>STN@ (200x200)</mdui-menu-item>
                    </mdui-menu>
                </mdui-dropdown>
                <mdui-slider id={"image-brightness-slider"} min="0" max="100" value="50"></mdui-slider>
                <mdui-checkbox id={"image-dithering-checkbox"}>Enable dithering</mdui-checkbox>
                <mdui-checkbox checked disabled id={"image-1bit-checkbox"}>1-bit color</mdui-checkbox>
                <mdui-switch id={"image-orientation"}>Portrait</mdui-switch>
                <mdui-switch id={"image-flip-horizontal"}>Flip horizontally</mdui-switch>
                <mdui-switch id={"image-flip-vertical"}>Vertically</mdui-switch>
                <mdui-button id="connect-button">Connect to display</mdui-button>
                {/*<mdui-circular-progress></mdui-circular-progress>*/}
            </div>
            <div className={"canvas"}></div>
        </div>
    );
}

export default App;