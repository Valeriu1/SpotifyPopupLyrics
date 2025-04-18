(async function SpicetifyPiPLyrics() {
    if (!Spicetify.Platform) {
        setTimeout(SpicetifyPiPLyrics, 300);
        return;
    }

    class LyricsPiP {
        constructor() {
            this.pipWindow = null;
            this.isEnabled = false;
            this.originalParent = null;
            this.mainViewElement = null;
            this.button = null;
            this.progressUpdateInterval = null;
            this.resizeObserver = null;
            this.setupButton();
        }

        setupButton() {
            this.button = new Spicetify.Playbar.Button(
                "Picture in Picture MainView",
                "chart-up",
                () => this.togglePiP(),
                "pip-lyrics",
                false
            );

            if (!this.isEnabled) {
                this.button.disabled = false;
            }
        }

        createTitleBar() {
            const titleBar = document.createElement('div');
            titleBar.className = 'pip-title-bar';
            
            // Close button with X icon
            const closeButton = document.createElement('button');
            closeButton.className = 'pip-close-button';
            closeButton.innerHTML = `
                <svg data-encore-id="icon" role="img" aria-hidden="true" class="Svg-img-icon-xsmall" viewBox="0 0 16 16">
                    <path d="M2.47 2.47a.75.75 0 0 1 1.06 0L8 6.94l4.47-4.47a.75.75 0 1 1 1.06 1.06L9.06 8l4.47 4.47a.75.75 0 1 1-1.06 1.06L8 9.06l-4.47 4.47a.75.75 0 0 1-1.06-1.06L6.94 8 2.47 3.53a.75.75 0 0 1 0-1.06Z"></path>
                </svg>
            `;
            closeButton.onclick = () => this.pipWindow.close();

            // Drag icon
            const dragIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="Svg-img-icon-medium">
                                <path d="M6 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
                             </svg>`;

            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = dragIcon

            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'title-bar-first';
            
            titleBar.appendChild(emptyDiv);
            titleBar.appendChild(iconSpan);            
            titleBar.appendChild(closeButton);
            return titleBar;
        }

        createTrackProgressBar() {
            const progressContainer = document.createElement('div');
            progressContainer.className = 'pip-progress-container';

            // Current time label
            const currentTimeLabel = document.createElement('span');
            currentTimeLabel.className = 'pip-current-time';
            currentTimeLabel.textContent = '0:00';

            // Progress bar wrapper
            const progressBarWrapper = document.createElement('div');
            progressBarWrapper.className = 'pip-progress-bar-wrapper';

            // Progress bar
            const progressBar = document.createElement('div');
            progressBar.className = 'pip-progress-bar';

            const progressBarFill = document.createElement('div');
            progressBarFill.className = 'pip-progress-bar-fill';

            const progressBarHandle = document.createElement('div');
            progressBarHandle.className = 'pip-progress-bar-handle';

            progressBar.appendChild(progressBarFill);
            progressBar.appendChild(progressBarHandle);
            progressBarWrapper.appendChild(progressBar);

            // End time label
            const endTimeLabel = document.createElement('span');
            endTimeLabel.className = 'pip-end-time';
            endTimeLabel.textContent = '0:00';

            // Assemble progress container
            progressContainer.appendChild(currentTimeLabel);
            progressContainer.appendChild(progressBarWrapper);
            progressContainer.appendChild(endTimeLabel);

            // Add event listeners for seeking
            const seekData = this.setupSeekEvents(
                progressBarWrapper, 
                progressBarFill, 
                progressBarHandle, 
                currentTimeLabel
            );

            return {
                container: progressContainer,
                currentTimeLabel,
                progressBar,
                progressBarFill,
                progressBarHandle,
                progressBarWrapper,
                endTimeLabel,
                ...seekData
            };
        }

        setupSeekEvents(progressBarWrapper, progressBarFill, progressBarHandle, currentTimeLabel) {
            // Calculate the seek percentage based on the click event's X position.
            const calculateSeekPercentage = (event) => {
                const rect = progressBarWrapper.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;
                // Clamp percentage between 0 and 100.
                return Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
            };
        
            // Update the progress bar visuals and current time label.
            const updateUI = (percentage) => {
                const duration = window.Spicetify.Player.getDuration();
                const currentSeekTime = (percentage / 100) * duration;
                progressBarFill.style.width = `${percentage}%`;
                progressBarHandle.style.left = `${percentage}%`;
                currentTimeLabel.textContent = this.formatTime(currentSeekTime / 1000);
                return currentSeekTime;
            };
        
            // On click, calculate the desired seek position and perform the seek.
            const handleClick = (event) => {
                event.preventDefault();
                const percentage = calculateSeekPercentage(event);
                const seekTime = updateUI(percentage);
                Spicetify.Player.seek(seekTime);
            };
        
            // Attach the click event listener.
            progressBarWrapper.addEventListener('click', handleClick);
        
            // Return the event handler for potential future cleanup.
            return { handleClick };
        }

        formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        updateTrackProgress(progressElements) {
            if (!progressElements) return;

            const { currentTimeLabel, progressBarFill, progressBarHandle, endTimeLabel } = progressElements;

            // Get current track duration and progress
            const duration = window.Spicetify.Player.getDuration();
            const progress = window.Spicetify.Player.getProgress();

            // Update time labels
            currentTimeLabel.textContent = this.formatTime(progress / 1000);
            endTimeLabel.textContent = this.formatTime(duration / 1000);

            // Update progress bar
            const progressPercentage = (progress / duration) * 100;
            progressBarFill.style.width = `${progressPercentage}%`;
            progressBarHandle.style.left = `${progressPercentage}%`;
        }

        createNowPlayingInfo() {
            const nowPlayingContainer = document.createElement('div');
            nowPlayingContainer.className = 'pip-now-playing-container';

            // Create album art element
            const albumArt = document.createElement('div');
            albumArt.className = 'pip-album-art';
            
            // Create track info container
            const trackInfoContainer = document.createElement('div');
            trackInfoContainer.className = 'pip-track-info';

            // Create track name element
            const trackName = document.createElement('div');
            trackName.className = 'pip-track-name';

            // Create artist name element
            const artistName = document.createElement('div');
            artistName.className = 'pip-artist-name';

            // Update track information
            const updateTrackInfo = () => {
                try {
                    const currentTrack = window.Spicetify.Player.data?.item;
                    const artists = window.Spicetify.Player.data?.item.artists;
                    artistName.textContent = '';
                    trackName.textContent = '';
                    if (currentTrack && currentTrack.metadata) {
                        // Update album art
                        if (currentTrack.metadata.image_url) {
                            albumArt.style.backgroundImage = `url('${currentTrack.metadata.image_url}')`;
                            albumArt.style.backgroundSize = 'cover';
                            albumArt.style.backgroundPosition = 'center';
                        } else {
                            // Fallback if no image
                            albumArt.style.backgroundColor = '#333';
                        }

                        // Update track and artist names
                        trackName.textContent = currentTrack.metadata.title;
                        if (artists && artists.length > 1) {
                            const artistNames =  artists.map(artist => artist.name);
                            artistName.textContent = artistNames.join(', ');
                        } else {
                            artistName.textContent = currentTrack.metadata.artist_name;
                        }

                        // Check if text is overflowing and apply animation class
                        setTimeout(() => {
                            this.checkTextOverflow(trackName);
                            this.checkTextOverflow(artistName);
                        }, 100);
                    }
                } catch (error) {
                    console.error('Error updating track info:', error);
                }
            };

            // Initial update
            updateTrackInfo();

            // Listen for track changes
            window.Spicetify.Player.addEventListener("songchange", updateTrackInfo);

            // Assemble the container
            trackInfoContainer.appendChild(trackName);
            trackInfoContainer.appendChild(artistName);

            nowPlayingContainer.appendChild(albumArt);
            nowPlayingContainer.appendChild(trackInfoContainer);

            return nowPlayingContainer;
        }

        checkTextOverflow(element) {
            if (!element) return;
            // Remove any existing animation (so we can re-run it)
            element.classList.remove('text-scroll');
            element.style.animation = '';
            
            // Check if the text is overflowing its container
            if (element.scrollWidth > element.clientWidth) {
                const overflow = element.scrollWidth - element.clientWidth;
                // Set a speed factor (here, 10 pixels per second)
                const duration = overflow / 10;
                // Set a CSS variable to be used in keyframes
                element.style.setProperty('--overflow', `${overflow}px`);
                // Apply the animation inline (it will run once and finish)
                element.style.animation = `scroll-text ${duration}s linear forwards`;
                element.classList.add('text-scroll');
            }
        }

        createPlayerControls() {
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'pip-player-controls-container';

            // Create player controls wrapper with now playing info
            const playerControlsWrapper = document.createElement('div');
            playerControlsWrapper.className = 'pip-player-controls-wrapper';

            // Create now playing info
            const nowPlayingInfo = this.createNowPlayingInfo();

            // Create player controls
            const playerControls = document.createElement('div');
            playerControls.className = 'pip-player-controls';

            // Shuffle button
            const shuffleButton = document.createElement('button');
            shuffleButton.className = 'pip-control-button pip-shuffle-button responsive-control';
            shuffleButton.dataset.priority = '3'; // Lowest priority - hides first
            shuffleButton.innerHTML = this.getShuffleIcon(window.Spicetify.Player.getShuffle());
            shuffleButton.onclick = () => {
                window.Spicetify.Player.toggleShuffle();
                setTimeout(() => {
                    this.updateShuffleButton(shuffleButton);
                }, 200);
            };

            // Previous button
            const prevButton = document.createElement('button');
            prevButton.className = 'pip-control-button pip-prev-button responsive-control';
            prevButton.dataset.priority = '1'; // Highest priority - hides last
            prevButton.innerHTML = `
                <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ">
                    <path d="M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z"></path>
                </svg>
            `;
            prevButton.onclick = () => {
                window.Spicetify.Player.back();
            };

            // Play/Pause button (always visible)
            const playPauseButton = document.createElement('button');
            playPauseButton.className = 'pip-control-button pip-play-pause';
            playPauseButton.innerHTML = this.getPlayPauseIcon(window.Spicetify.Player.isPlaying());
            playPauseButton.onclick = () => {
                window.Spicetify.Player.togglePlay();
                setTimeout(() => {
                    this.updatePlayPauseButton(playPauseButton);
                }, 200);
            };

            // Next button (always visible)
            const nextButton = document.createElement('button');
            nextButton.className = 'pip-control-button pip-next-button';
            nextButton.innerHTML = `
                <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ">
                    <path d="M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z"></path>
                </svg>
            `;
            nextButton.onclick = () => {
                window.Spicetify.Player.next();
            };

            // Repeat button
            const repeatButton = document.createElement('button');
            repeatButton.className = 'pip-control-button pip-repeat-button responsive-control';
            repeatButton.dataset.priority = '2'; // Medium priority - hides second
            repeatButton.innerHTML = this.getRepeatIcon(window.Spicetify.Player.getRepeat());
            repeatButton.onclick = () => {
                window.Spicetify.Player.toggleRepeat();
                setTimeout(() => {
                    this.updateRepeatButton(repeatButton);
                }, 200);
            };

            // Create the SVG element and position it at bottom right
            const cornerSvg = document.createElement('div');
            cornerSvg.innerHTML = `<svg class="UuWUqZ0KXYAc2I1R_tdl" width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="0.823223" y1="8.82322" x2="8.82322" y2="0.823223" stroke="#727272" stroke-width="0.5"></line> 
                <line x1="4.82322" y1="8.82322" x2="8.82322" y2="4.82322" stroke="#727272" stroke-width="0.5"></line>
            </svg>`;
            cornerSvg.style.position = "absolute"; 
            cornerSvg.style.bottom = "0px";
            cornerSvg.style.right = "0px";

            // Add buttons to controls
            playerControls.appendChild(shuffleButton);
            playerControls.appendChild(prevButton);
            playerControls.appendChild(playPauseButton);
            playerControls.appendChild(nextButton);
            playerControls.appendChild(repeatButton);

            // Store responsive controls for later use
            this.responsiveControls = [shuffleButton, repeatButton, prevButton];

            // Add now playing info and controls to wrapper
            playerControlsWrapper.appendChild(nowPlayingInfo);
            playerControlsWrapper.appendChild(playerControls);

            // Create progress bar
            const progressElements = this.createTrackProgressBar();

            // Assemble containers
            controlsContainer.appendChild(playerControlsWrapper);
            controlsContainer.appendChild(progressElements.container);

            //Add corner svg
            controlsContainer.appendChild(cornerSvg);

            this.resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    this.handleResize(entry.target);
                }
            });
            this.resizeObserver.observe(controlsContainer);

            // Setup player state event listeners
            window.Spicetify.Player.addEventListener("onplaypause", () => {
                if (this.isEnabled && playPauseButton) {
                    this.updatePlayPauseButton(playPauseButton);
                }
            });

            window.Spicetify.Player.addEventListener("shufflechange", () => {
                if (this.isEnabled && shuffleButton) {
                    this.updateShuffleButton(shuffleButton);
                }
            });

            window.Spicetify.Player.addEventListener("repeatchange", () => {
                if (this.isEnabled && repeatButton) {
                    this.updateRepeatButton(repeatButton);
                }
            });

            // Setup progress tracking
            this.progressUpdateInterval = setInterval(() => {
                if (this.isEnabled) {
                    this.updateTrackProgress(progressElements);

                }
            }, 1000);

            // Setup player state event listeners
            window.Spicetify.Player.addEventListener("onprogress", () => {
                if (this.isEnabled) {
                    this.updateTrackProgress(progressElements);
                }
            });

            return controlsContainer;
        }

        getPlayPauseIcon(isPlaying) {
            return isPlaying ? `
                <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ">
                    <path d="M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z"></path>
                </svg>
            ` : `
                <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ">
                    <path d="M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z"></path>
                </svg>
            `;
        }

        getShuffleIcon(isEnabled) {
            return `
                <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ ${isEnabled ? 'shuffle-enabled' : ''}">
                    <path d="M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5z"></path>
                    <path d="m7.5 10.723.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z"></path>
                </svg>
            `;
        }

        getRepeatIcon(repeatState) {
            // repeatState: 0 = off, 1 = all, 2 = one
            if (repeatState === 2) {
                return `
                    <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ repeat-one-enabled">
                       <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h.75v1.5h-.75A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5ZM12.25 2.5a2.25 2.25 0 0 1 2.25 2.25v5A2.25 2.25 0 0 1 12.25 12H9.81l1.018-1.018a.75.75 0 0 0-1.06-1.06L6.939 12.75l2.829 2.828a.75.75 0 1 0 1.06-1.06L9.811 13.5h2.439A3.75 3.75 0 0 0 16 9.75v-5A3.75 3.75 0 0 0 12.25 1h-.75v1.5h.75Z"></path>
                       <path d="m8 1.85.77.694H6.095V1.488c.697-.051 1.2-.18 1.507-.385.316-.205.51-.51.583-.913h1.32V8H8V1.85Z"></path>
                    </svg>
                `;
            } else if (repeatState === 1) {
                return `
                    <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ repeat-all-enabled">
                        <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path>
                    </svg>
                `;
            } else {
                return `
                    <svg role="img" height="16" width="16" viewBox="0 0 16 16" class="Svg-sc-ytk21e-0 dCszzJ">
                        <path d="M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z"></path>
                    </svg>
                `;
            }
        }

        updatePlayPauseButton(button) {
            if (button) {
                const isPlaying = window.Spicetify.Player.isPlaying();
                button.innerHTML = this.getPlayPauseIcon(isPlaying);
            }
        }

        updateShuffleButton(button) {
            if (button) {
                const isShuffling = window.Spicetify.Player.getShuffle();
                button.innerHTML = this.getShuffleIcon(isShuffling);
                if (isShuffling) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        }

        updateRepeatButton(button) {
            if (button) {
                const repeatState = window.Spicetify.Player.getRepeat();
                button.innerHTML = this.getRepeatIcon(repeatState);
                button.setAttribute('data-repeat-state', repeatState);
                if (repeatState > 0) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        }

        handleResize(controlsContainer) {
            if (!this.responsiveControls || !controlsContainer) return;
            
            const containerWidth = controlsContainer.clientWidth;
            
            // Sort controls by priority (higher number = lower priority = hide first)
            const sortedControls = [...this.responsiveControls].sort((a, b) => {
                return Number(b.dataset.priority) - Number(a.dataset.priority);
            });
            
            // Widths at which controls should be hidden
            const breakpoints = [
                { width: 400, hideControls: 1 }, // Hide lowest priority control (shuffle)
                { width: 350, hideControls: 2 }, // Hide next lowest priority (repeat)
                { width: 300, hideControls: 3 }  // Hide highest priority (prev)
            ];
            
            // Determine how many controls to hide
            let controlsToHide = 0;
            for (const breakpoint of breakpoints) {
                if (containerWidth <= breakpoint.width) {
                    controlsToHide = breakpoint.hideControls;
                }
            }
            
            // Show/hide controls based on container width
            sortedControls.forEach((control, index) => {
                if (index < controlsToHide) {
                    control.classList.add('hidden');
                } else {
                    control.classList.remove('hidden');
                }
            });
        }

        copyResources() {
            // Copy all stylesheets
            Array.from(document.styleSheets).forEach(stylesheet => {
                try {
                    if (stylesheet.href) {
                        // External stylesheet
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = stylesheet.href;
                        this.pipWindow.document.head.appendChild(link);
                    } else {
                        // Inline stylesheet
                        const style = document.createElement('style');
                        Array.from(stylesheet.cssRules).forEach(rule => {
                            style.appendChild(document.createTextNode(rule.cssText));
                        });
                        this.pipWindow.document.head.appendChild(style);
                    }
                } catch (e) {
                    console.warn('Failed to copy stylesheet:', e);
                }
            });

            // Copy scripts
            Array.from(document.scripts).forEach(script => {
                const newScript = this.pipWindow.document.createElement('script');
                
                // Copy script attributes
                Array.from(script.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // Copy inline script content
                if (!script.src) {
                    newScript.textContent = script.textContent;
                }

                this.pipWindow.document.head.appendChild(newScript);
            });

            // Add base styles for PiP window
            const baseStyle = document.createElement('style');
            baseStyle.textContent = `
                body {
                    margin: 0;
                    background: #000000;
                    color: var(--spice-text);
                    overflow: hidden;
                    width: 100%;
                }
                .pip-container {
                    width: 100vw;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .pip-title-bar {
                    height: 26px;
                    background:  #000000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    -webkit-app-region: drag;
                    width: 100%;
                    flex-shrink: 0;
                }
                .pip-close-button {
                    background: transparent;
                    border: none;
                    color: #fff;
                    padding: 0px;
                    display: flex;
                    height: 12px;
                    margin: 7px 5px 5px 7px;
                    width: 12px;
                    -webkit-app-region: no-drag;
                    -webkit-box-align: center;
                    -ms-flex-align: center;
                    align-items: center;
                    -webkit-box-pack: center;
                    -ms-flex-pack: center;
                    justify-content: center;
                    -webkit-app-region: no-drag;
                }
                .Root__main-view {
                    height: calc(100vh - 76px); /* Reduced height to make room for now playing bar */
                    width: 100%;
                    overflow-y: auto;
                    flex: 1;
                }
                .Svg-img-icon-xsmall {
                    fill: #fff;
                    width:  12px;
                    height:  12px;
                }
                    .Svg-img-icon-xsmall:hover {
                       fill: #b3b3b3;
                    }
                .Svg-img-icon-medium {
                    fill: #b3b3b3;
                    width:  24px;
                    height: 24px;
                }
                .title-bar-first {                
                    height: 12px;
                    margin-inline: 5px;
                    width: 12px;
                }    
                .ViewControls {
                   display: none !important;
                }

                .pip-control-button {
                    background: transparent;
                    border: none;
                    color: #fff;
                    fill: #b3b3b3;
                    cursor: pointer;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.1s ease;
                }
                .pip-control-button:hover {
                    transform: scale(1.1);
                    background-color: rgba(255, 255, 255, 0.1);
                }
                .pip-play-pause {
                    background-color: #fff;
                    color: #000;
                }
                .pip-play-pause svg {
                    fill: #000;
                }
                .pip-play-pause:hover {
                    transform: scale(1.1);
                    background-color: #fff;
                }
                .pip-control-button.active svg {
                    fill: #1ed760;
                }
                .shuffle-enabled, .repeat-all-enabled, .repeat-one-enabled {
                    fill: #1ed760;
                }

                .pip-player-controls-container {
                    display: flex;
                    flex-direction: column;
                    background: rgb(0, 0, 0);
                    width: 100%;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .pip-player-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                }

                .pip-progress-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 15px 8px;
                    height: 30px;
                }

                .pip-current-time, 
                .pip-end-time {
                    color: #b3b3b3;
                    font-size: 11px;
                    width: 35px;
                    text-align: center;
                }

                .pip-progress-bar-wrapper {
                    flex-grow: 1;
                    height: 4px;
                    cursor: pointer;
                    position: relative;
                }

                .pip-progress-bar {
                    height: 100%;
                    background-color: rgba(255, 255, 255, 0.2);
                    border-radius: 2px;
                    overflow: hidden;
                    position: relative;
                }

                .pip-progress-bar-fill {
                    height: 100%;
                    background-color: #ffffff;
                    width: 0;
                    transition: width 0.1s linear;
                    position: absolute;
                    left: 0;
                    top: 0;
                }

                .pip-progress-bar-handle {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background-color: #ffffff;
                    border-radius: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    left: 0;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }

                .pip-progress-bar-wrapper:hover .pip-progress-bar-handle {
                    opacity: 1;
                }

                .pip-progress-bar-wrapper:hover .pip-progress-bar-fill {
                    background-color: #1ed760;
                }
            `;
            this.pipWindow.document.head.appendChild(baseStyle);

            const nowPlayingStyles = document.createElement('style');
            nowPlayingStyles.textContent = `
                .pip-player-controls-container {
                    display: flex;
                    flex-direction: column;
                    background: rgb(0, 0, 0);
                    width: 100%;
                }

                .pip-player-controls-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 15px;
                    background: rgb(0, 0, 0);
                }

                .pip-now-playing-container {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex-grow: 1;
                    min-width: 0;
                }

                .pip-album-art {
                    width: 56px;
                    height: 56px;
                    border-radius: 4px;
                    background-color: #333;
                    flex-shrink: 0;
                }

                .pip-track-info {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    overflow: hidden;
                    flex-grow: 1;
                    min-width: 0;
                    mask-image: linear-gradient(
                        to right,
                        white 0%,
                        white calc(100% - 6px),
                        transparent 100%
                    );
                    -webkit-mask-image: linear-gradient(
                        to right,
                        white 0%,
                        white calc(100% - 6px),
                        transparent 100%
                    );
                }

                .pip-track-name {
                    color: #ffffff;
                    font-size: 14px;
                    font-weight: 600;
                   
                }
           
                .pip-artist-name {
                    color: #b3b3b3;
                    font-size: 12px;
                }

                .pip-track-name,
                .pip-artist-name {
                    white-space: nowrap;
                    max-width: 100%;
                    display: inline-block;                    
                }

                .pip-player-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                }

                .responsive-control.hidden {
                    display: none;
                }

               @keyframes scroll-text {
                    0% {
                        transform: translateX(0);
                    }
                    50% {
                        transform: translateX(calc(-1 * var(--overflow)));
                    }
                    100% {
                        transform: translateX(0);
                    }
                }
            `;
            this.pipWindow.document.head.appendChild(nowPlayingStyles);
        }

        async togglePiP() {
            if (!this.isEnabled) {
                try {
                    // Find the main view container
                    const mainView = document.querySelector('.Root__main-view');
                    if (!mainView) {
                        window.Spicetify.showNotification("Could not find main view!");
                        return;
                    }

                    this.pipWindow = await documentPictureInPicture.requestWindow({
                        width: 500,
                        height: 600
                    });

                    // Store references for restoration
                    this.mainViewElement = mainView;
                    this.originalParent = mainView.parentElement;

                    // Copy over all resources
                    this.copyResources();

                    // Create container with titlebar
                    const container = document.createElement('div');
                    container.className = 'pip-container';
                    container.appendChild(this.createTitleBar());
                    
                    // Move the main view into the container
                    container.appendChild(this.mainViewElement);
                    
                    // Create player controls container
                    const playerControlsContainer = document.createElement('div');
                    playerControlsContainer.className = 'pip-player-controls-container';
                    
                    // Add our custom player controls
                    const playerControls = this.createPlayerControls();
                    playerControlsContainer.appendChild(playerControls);                                        
                    container.appendChild(playerControlsContainer);

                    // Add container to PiP window
                    this.pipWindow.document.body.appendChild(container);
                    this.isEnabled = true;

                    // Ensure progress tracking is active
                    if (this.progressUpdateInterval) {
                        clearInterval(this.progressUpdateInterval);
                    }

                    // Handle PiP window closing
                    this.pipWindow.addEventListener('pagehide', () => {
                        this.restoreMainView();
                    });

                    this.button.active = true;

                } catch (error) {
                    console.error('Failed to create PiP window:', error);
                    window.Spicetify.showNotification("Failed to create Picture-in-Picture window");
                    this.restoreMainView();
                }
            } else {
                // Clear progress tracking when closing PiP
                if (this.progressUpdateInterval) {
                    clearInterval(this.progressUpdateInterval);
                }
                this.pipWindow.close();
                this.button.active = false;
            }
        }

        restoreMainView() {
             // Clear progress tracking
            if (this.progressUpdateInterval) {
                clearInterval(this.progressUpdateInterval);
            }

            if (this.mainViewElement && this.originalParent) {
                // Move the main view element back to its original location
                this.originalParent.appendChild(this.mainViewElement);
                this.mainViewElement = null;
                this.originalParent = null;
            }

            this.pipWindow = null;
            this.isEnabled = false;
            this.button.active = false;
        }
    }

    new LyricsPiP();
})();